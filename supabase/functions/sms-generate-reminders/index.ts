import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FULL_AUTO_FLAG = "sms_auto_full";
const BASIC_AUTO_FLAG = "sms_auto_basic";

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

function currentMonthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const now = new Date();
    const todayDay = now.getUTCDate();
    const currentHour = now.getUTCHours();
    const monthKey = currentMonthKey(now);

    // Allow manual override via query/body for testing
    const url = new URL(req.url);
    const forceDay = url.searchParams.get("force_day");
    const forceHour = url.searchParams.get("force_hour");
    const matchDay = forceDay ? parseInt(forceDay, 10) : todayDay;
    const matchHour = forceHour ? parseInt(forceHour, 10) : currentHour;

    // 1. Find schedules matching this day + hour
    const { data: schedules, error: schedErr } = await supabase
      .from("sms_schedules")
      .select(`
        id, organization_id, slot_index, day_of_month, send_hour, template_id, is_active,
        send_email, email_template_id,
        sms_templates(id, content),
        email_templates:email_template_id(id, subject, html_content)
      `)
      .eq("is_active", true)
      .eq("day_of_month", matchDay)
      .eq("send_hour", matchHour);

    if (schedErr) throw schedErr;
    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          generated: 0,
          message: `No schedules at day=${matchDay} hour=${matchHour}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Resolve plans/feature flags per org
    const orgIds = Array.from(new Set(schedules.map((s) => s.organization_id)));

    const { data: subs } = await supabase
      .from("subscriptions")
      .select("organization_id, plan, status")
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

    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, sms_sender_name")
      .in("id", orgIds);
    const orgNameById = new Map<string, string>();
    for (const o of orgs || []) orgNameById.set(o.id, o.sms_sender_name || o.name || "RentFlow");

    let generated = 0;
    let skippedPlan = 0;
    let skippedExisting = 0;
    let skippedNoTenants = 0;

    for (const sched of schedules) {
      const orgId = sched.organization_id;
      const planSlug = planByOrg.get(orgId) || "starter";
      const flags = flagsByPlan.get(planSlug) || [];
      const tplContent = (sched as any).sms_templates?.content as string | undefined;
      if (!tplContent) continue;

      const hasBasic = flags.includes(BASIC_AUTO_FLAG);
      const hasFull = flags.includes(FULL_AUTO_FLAG);

      if (!hasBasic && !hasFull) {
        skippedPlan++;
        continue;
      }
      // Starter (basic only) → only slot_index = 1
      if (!hasFull && sched.slot_index !== 1) {
        skippedPlan++;
        continue;
      }

      // Find all tenants of this org with an UNPAID rent payment for the current month.
      // Only target tenants who haven't fully paid yet (paid_amount < amount).
      // Status 'paid' is excluded explicitly + paid_amount check covers any desync.
      const { data: payments, error: payErr } = await supabase
        .from("rent_payments")
        .select(`
          id, amount, paid_amount, due_date, status, month,
          tenants!inner(id, full_name, phone, is_active, unit_id,
            units!inner(property_id,
              properties!inner(organization_id)
            )
          )
        `)
        .eq("month", monthKey)
        .in("status", ["pending", "late", "partial"]);

      if (payErr) {
        console.error(`[generate] error fetching payments for sched ${sched.id}:`, payErr);
        continue;
      }
      const orgPayments = (payments || []).filter((p: any) => {
        if (p.tenants?.units?.properties?.organization_id !== orgId) return false;
        // Skip inactive tenants (lease ended)
        if (p.tenants?.is_active === false) return false;
        // Double-check: only unpaid balance
        const amount = Number(p.amount || 0);
        const paid = Number(p.paid_amount || 0);
        return paid < amount;
      });

      if (orgPayments.length === 0) {
        skippedNoTenants++;
        continue;
      }

      for (const payment of orgPayments) {
        const tenant = (payment as any).tenants;
        if (!tenant?.phone) continue;

        // Anti-dup: one SMS per (schedule, tenant, month)
        const { data: existing } = await supabase
          .from("sms_messages")
          .select("id")
          .eq("schedule_id", sched.id)
          .eq("tenant_id", tenant.id)
          .eq("trigger_type", "auto")
          .gte("created_at", `${monthKey}-01T00:00:00Z`)
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

    console.log(
      `[sms-generate-reminders] day=${matchDay} hour=${matchHour} generated=${generated} skipped_plan=${skippedPlan} skipped_existing=${skippedExisting} skipped_no_tenants=${skippedNoTenants}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        generated,
        skipped_plan: skippedPlan,
        skipped_existing: skippedExisting,
        skipped_no_tenants: skippedNoTenants,
        matched_day: matchDay,
        matched_hour: matchHour,
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
