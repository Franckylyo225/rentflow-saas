import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STARTER_FLAGS = new Set(["sms_basic"]);
// Plans that allow full automatic reminders (any schedule offset)
const FULL_AUTO_FLAG = "sms_auto_full";

function fmtAmount(n: number): string {
  return Number(n || 0).toLocaleString("fr-FR");
}

function fmtDate(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function renderTemplate(content: string, vars: Record<string, string>): string {
  let out = content;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), v ?? "");
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Get all active schedules with their template + organization
    const { data: schedules, error: schedErr } = await supabase
      .from("sms_schedules")
      .select(`
        id, organization_id, offset_days, template_id, is_active,
        sms_templates(id, content)
      `)
      .eq("is_active", true);

    if (schedErr) throw schedErr;
    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ success: true, generated: 0, message: "No active schedules" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Group org IDs to fetch plan/feature flags once
    const orgIds = Array.from(new Set(schedules.map((s) => s.organization_id)));

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("organization_id, plan")
      .in("organization_id", orgIds);

    const planByOrg = new Map<string, string>();
    for (const s of subs || []) planByOrg.set(s.organization_id, s.plan);

    const planSlugs = Array.from(new Set(Array.from(planByOrg.values())));
    const { data: plans } = await supabase
      .from("plans")
      .select("slug, feature_flags")
      .in("slug", planSlugs.length ? planSlugs : ["starter"]);
    const flagsByPlan = new Map<string, string[]>();
    for (const p of plans || []) flagsByPlan.set(p.slug, (p.feature_flags as string[]) || []);

    // Org name cache for variable rendering
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, sms_sender_name")
      .in("id", orgIds);
    const orgNameById = new Map<string, string>();
    for (const o of orgs || []) orgNameById.set(o.id, o.sms_sender_name || o.name || "RentFlow");

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let generated = 0;
    let skippedPlan = 0;
    let skippedExisting = 0;

    for (const sched of schedules) {
      const orgId = sched.organization_id;
      const planSlug = planByOrg.get(orgId) || "starter";
      const flags = flagsByPlan.get(planSlug) || [];
      const tplContent = (sched as any).sms_templates?.content as string | undefined;
      if (!tplContent) continue;

      // Plan gating: Starter only allowed J-5 (offset_days = -5)
      const isFullAuto = flags.includes(FULL_AUTO_FLAG);
      if (!isFullAuto && sched.offset_days !== -5) {
        skippedPlan++;
        continue;
      }

      // Compute target due_date: payment is due on (today - offset_days)
      // offset_days = -5 means "5 days BEFORE due" → due_date = today + 5
      // offset_days = +3 means "3 days AFTER due" → due_date = today - 3
      const targetDate = new Date(today);
      targetDate.setUTCDate(targetDate.getUTCDate() - sched.offset_days);
      const targetDateStr = targetDate.toISOString().split("T")[0];

      // Eligible payment statuses
      const statuses = sched.offset_days < 0 ? ["pending"] : ["pending", "late", "partial"];

      const { data: payments, error: payErr } = await supabase
        .from("rent_payments")
        .select(`
          id, amount, due_date, status,
          tenants!inner(id, full_name, phone, unit_id,
            units!inner(property_id,
              properties!inner(organization_id)
            )
          )
        `)
        .eq("due_date", targetDateStr)
        .in("status", statuses);

      if (payErr) {
        console.error(`[generate] error fetching payments for sched ${sched.id}:`, payErr);
        continue;
      }
      if (!payments || payments.length === 0) continue;

      // Filter to this org
      const orgPayments = payments.filter(
        (p: any) => p.tenants?.units?.properties?.organization_id === orgId
      );

      for (const payment of orgPayments) {
        const tenant = (payment as any).tenants;
        if (!tenant?.phone) continue;

        // Anti-dup: check if a sms_messages row already exists for this rent_payment + schedule
        const { data: existing } = await supabase
          .from("sms_messages")
          .select("id")
          .eq("rent_payment_id", payment.id)
          .eq("schedule_id", sched.id)
          .eq("trigger_type", "auto")
          .maybeSingle();

        if (existing) {
          skippedExisting++;
          continue;
        }

        const dueDate = new Date(payment.due_date);
        const variables = {
          tenant_name: tenant.full_name,
          rent_amount: fmtAmount(payment.amount),
          due_date: fmtDate(dueDate),
          agency_name: orgNameById.get(orgId) || "RentFlow",
        };
        const finalContent = renderTemplate(tplContent, variables);

        const { error: insErr } = await supabase.from("sms_messages").insert({
          organization_id: orgId,
          recipient_phone: tenant.phone,
          recipient_name: tenant.full_name,
          content: finalContent,
          template_id: sched.template_id,
          schedule_id: sched.id,
          tenant_id: tenant.id,
          rent_payment_id: payment.id,
          trigger_type: "auto",
          status: "scheduled",
          scheduled_for: new Date().toISOString(),
        });

        if (insErr) {
          console.error(`[generate] insert error for payment ${payment.id}:`, insErr);
          continue;
        }
        generated++;
      }
    }

    console.log(`[sms-generate-reminders] generated=${generated} skipped_plan=${skippedPlan} skipped_existing=${skippedExisting}`);

    return new Response(
      JSON.stringify({
        success: true,
        generated,
        skipped_plan: skippedPlan,
        skipped_existing: skippedExisting,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sms-generate-reminders] error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
