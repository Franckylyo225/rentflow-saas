// Process marketing workflows: enrolls due steps, evaluates conditions, sends emails.
// Designed to be invoked by cron (every 15 min) or manually by super admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "RentFlow <noreply@rent-flow.net>";
const PUBLIC_FN_BASE = `${SUPABASE_URL}/functions/v1`;

function replaceVars(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

function instrumentHtml(html: string, recipientId: string, campaignId: string): string {
  const rewritten = html.replace(/href="(https?:\/\/[^"]+)"/g, (_, url) => {
    const wrapped = `${PUBLIC_FN_BASE}/track-click?r=${recipientId}&c=${campaignId}&u=${encodeURIComponent(url)}`;
    return `href="${wrapped}"`;
  });
  const pixel = `<img src="${PUBLIC_FN_BASE}/track-open?r=${recipientId}&c=${campaignId}" width="1" height="1" style="display:none" alt="" />`;
  return rewritten + pixel;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();
  const stats = { scheduled: 0, sent: 0, skipped: 0, failed: 0, completed: 0 };

  try {
    // --- 1. Schedule next steps for active enrollments that have no pending run ---
    const { data: activeEnrollments } = await admin
      .from("marketing_workflow_enrollments")
      .select("id,workflow_id,contact_id,enrolled_at,current_step_order,marketing_workflows!inner(is_active)")
      .eq("status", "active");

    for (const enr of activeEnrollments ?? []) {
      // @ts-ignore embedded shape
      if (!enr.marketing_workflows?.is_active) continue;

      // Has a pending run? skip scheduling.
      const { count: pendingCount } = await admin
        .from("marketing_workflow_step_runs")
        .select("id", { count: "exact", head: true })
        .eq("enrollment_id", enr.id)
        .eq("status", "pending");
      if ((pendingCount ?? 0) > 0) continue;

      // Find next step
      const { data: nextStep } = await admin
        .from("marketing_workflow_steps")
        .select("*")
        .eq("workflow_id", enr.workflow_id)
        .eq("is_active", true)
        .gt("step_order", enr.current_step_order)
        .order("step_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!nextStep) {
        // No more steps -> complete enrollment
        await admin.from("marketing_workflow_enrollments")
          .update({ status: "completed", completed_at: now.toISOString() })
          .eq("id", enr.id);
        stats.completed++;
        continue;
      }

      const scheduledFor = new Date(new Date(enr.enrolled_at).getTime() + nextStep.delay_days * 86400000);
      await admin.from("marketing_workflow_step_runs").insert({
        enrollment_id: enr.id,
        step_id: nextStep.id,
        status: "pending",
        scheduled_for: scheduledFor.toISOString(),
      });
      stats.scheduled++;
    }

    // --- 2. Execute due pending runs ---
    const { data: dueRuns } = await admin
      .from("marketing_workflow_step_runs")
      .select("*, marketing_workflow_steps!inner(*), marketing_workflow_enrollments!inner(contact_id, workflow_id, current_step_order)")
      .eq("status", "pending")
      .lte("scheduled_for", now.toISOString())
      .limit(200);

    for (const run of dueRuns ?? []) {
      // @ts-ignore
      const step = run.marketing_workflow_steps;
      // @ts-ignore
      const enrollment = run.marketing_workflow_enrollments;

      // Evaluate condition vs previous step
      if (step.condition_type !== "always") {
        const { data: prevStep } = await admin
          .from("marketing_workflow_steps")
          .select("id")
          .eq("workflow_id", enrollment.workflow_id)
          .lt("step_order", step.step_order)
          .order("step_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (prevStep) {
          const { data: prevRun } = await admin
            .from("marketing_workflow_step_runs")
            .select("recipient_id")
            .eq("enrollment_id", run.enrollment_id)
            .eq("step_id", prevStep.id)
            .eq("status", "sent")
            .maybeSingle();

          let opened = false;
          if (prevRun?.recipient_id) {
            const { data: rcpt } = await admin
              .from("campaign_recipients")
              .select("open_count")
              .eq("id", prevRun.recipient_id)
              .maybeSingle();
            opened = (rcpt?.open_count ?? 0) > 0;
          }
          const shouldSend =
            (step.condition_type === "opened_previous" && opened) ||
            (step.condition_type === "not_opened_previous" && !opened);
          if (!shouldSend) {
            await admin.from("marketing_workflow_step_runs").update({
              status: "skipped",
              executed_at: now.toISOString(),
            }).eq("id", run.id);
            await admin.from("marketing_workflow_enrollments")
              .update({ current_step_order: step.step_order })
              .eq("id", run.enrollment_id);
            stats.skipped++;
            continue;
          }
        }
      }

      // Load contact
      const { data: contact } = await admin
        .from("marketing_contacts")
        .select("id,email,full_name,company,subscribed")
        .eq("id", enrollment.contact_id)
        .maybeSingle();

      if (!contact || !contact.email || !contact.subscribed) {
        await admin.from("marketing_workflow_step_runs").update({
          status: "skipped",
          executed_at: now.toISOString(),
          error_message: "contact missing or unsubscribed",
        }).eq("id", run.id);
        await admin.from("marketing_workflow_enrollments")
          .update({ current_step_order: step.step_order })
          .eq("id", run.enrollment_id);
        stats.skipped++;
        continue;
      }

      // Create a synthetic "campaign" recipient row for tracking opens/clicks.
      // We piggy-back on campaign_recipients with a placeholder campaign_id.
      // Use the workflow id as campaign_id for analytics grouping.
      const { data: recipient } = await admin
        .from("campaign_recipients")
        .insert({
          campaign_id: enrollment.workflow_id, // workflow as virtual campaign
          contact_id: contact.id,
          email: contact.email,
          status: "pending",
        })
        .select("id")
        .single();

      const vars = {
        name: contact.full_name ?? "",
        first_name: (contact.full_name ?? "").split(" ")[0] ?? "",
        email: contact.email,
        company: contact.company ?? "",
      };
      const subject = replaceVars(step.subject, vars);
      const html = instrumentHtml(replaceVars(step.html_content, vars), recipient!.id, enrollment.workflow_id);

      try {
        const r = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({ from: FROM_EMAIL, to: [contact.email], subject, html }),
        });
        if (r.ok) {
          stats.sent++;
          await admin.from("campaign_recipients").update({
            status: "sent", sent_at: now.toISOString(),
          }).eq("id", recipient!.id);
          await admin.from("marketing_workflow_step_runs").update({
            status: "sent",
            executed_at: now.toISOString(),
            recipient_id: recipient!.id,
          }).eq("id", run.id);
          await admin.from("marketing_workflow_enrollments")
            .update({ current_step_order: step.step_order })
            .eq("id", run.enrollment_id);
        } else {
          const body = await r.text();
          stats.failed++;
          await admin.from("marketing_workflow_step_runs").update({
            status: "failed",
            executed_at: now.toISOString(),
            error_message: body.slice(0, 500),
          }).eq("id", run.id);
        }
      } catch (e) {
        stats.failed++;
        await admin.from("marketing_workflow_step_runs").update({
          status: "failed",
          executed_at: now.toISOString(),
          error_message: String(e).slice(0, 500),
        }).eq("id", run.id);
      }

      await new Promise(r => setTimeout(r, 80));
    }

    return new Response(JSON.stringify({ success: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
