import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const TEMPLATE_KEY_MAP: Record<string, { dayOffset: number; statuses: string[] }> = {
  before_5: { dayOffset: 5, statuses: ["pending"] },
  after_1: { dayOffset: -1, statuses: ["pending", "late"] },
  after_7: { dayOffset: -7, statuses: ["pending", "late"] },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get all organizations with their notification templates
    const { data: templates, error: tplErr } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("email_enabled", true);

    if (tplErr) throw tplErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: "No active email templates" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group templates by organization
    const orgTemplates = new Map<string, typeof templates>();
    for (const t of templates) {
      const list = orgTemplates.get(t.organization_id) || [];
      list.push(t);
      orgTemplates.set(t.organization_id, list);
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    let totalSent = 0;
    let totalErrors = 0;

    for (const [orgId, orgTpls] of orgTemplates) {
      // Get org info for sender name
      const { data: org } = await supabase
        .from("organizations")
        .select("name, email")
        .eq("id", orgId)
        .single();

      const senderName = org?.name || "RentFlow";
      const fromEmail = `${senderName} <onboarding@resend.dev>`;

      for (const tpl of orgTpls) {
        const config = TEMPLATE_KEY_MAP[tpl.template_key];
        if (!config) continue;

        // Calculate target date
        const targetDate = new Date(today);
        targetDate.setUTCDate(targetDate.getUTCDate() + config.dayOffset);
        const targetDateStr = targetDate.toISOString().split("T")[0];

        // Find matching rent payments with tenant info
        const { data: payments, error: payErr } = await supabase
          .from("rent_payments")
          .select(`
            id, amount, paid_amount, due_date, status, month,
            tenants!inner(id, full_name, email, phone, unit_id,
              units!inner(property_id,
                properties!inner(organization_id, name)
              )
            )
          `)
          .eq("due_date", targetDateStr)
          .in("status", config.statuses);

        if (payErr) {
          console.error(`Error fetching payments for ${tpl.template_key}:`, payErr);
          continue;
        }
        if (!payments || payments.length === 0) continue;

        // Filter to this org's payments
        const orgPayments = payments.filter((p: any) =>
          p.tenants?.units?.properties?.organization_id === orgId
        );

        for (const payment of orgPayments) {
          const tenant = (payment as any).tenants;
          if (!tenant?.email) continue;

          // Check if already sent
          const { data: existing } = await supabase
            .from("email_reminder_logs")
            .select("id")
            .eq("rent_payment_id", payment.id)
            .eq("template_key", tpl.template_key)
            .maybeSingle();

          if (existing) continue;

          // Replace template variables
          const dueDate = new Date(payment.due_date);
          const formattedDate = `${dueDate.getUTCDate().toString().padStart(2, "0")}/${(dueDate.getUTCMonth() + 1).toString().padStart(2, "0")}/${dueDate.getUTCFullYear()}`;

          const emailContent = tpl.email_content
            .replace(/\{\{nom\}\}/g, tenant.full_name)
            .replace(/\{\{montant\}\}/g, payment.amount.toLocaleString("fr-FR"))
            .replace(/\{\{date_echeance\}\}/g, formattedDate);

          // Build HTML email
          const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #f8f9fa; border-radius: 8px; padding: 24px;">
                ${emailContent.split("\n").map((line: string) =>
                  line.trim() ? `<p style="margin: 0 0 12px; color: #333; line-height: 1.6;">${line}</p>` : ""
                ).join("")}
              </div>
              <p style="font-size: 12px; color: #999; margin-top: 20px; text-align: center;">
                Envoyé par ${senderName} via RentFlow
              </p>
            </div>
          `;

          const subject = tpl.template_key === "before_5"
            ? `Rappel : loyer dû le ${formattedDate}`
            : `Relance : loyer impayé du ${formattedDate}`;

          try {
            const res = await fetch(`${GATEWAY_URL}/emails`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": RESEND_API_KEY,
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [tenant.email],
                subject,
                html: htmlContent,
              }),
            });

            const resData = await res.json();

            if (!res.ok) {
              console.error(`Resend error for ${tenant.email}:`, resData);
              await supabase.from("email_reminder_logs").insert({
                rent_payment_id: payment.id,
                template_key: tpl.template_key,
                recipient_email: tenant.email,
                organization_id: orgId,
                status: "error",
                error_message: JSON.stringify(resData),
              });
              totalErrors++;
              continue;
            }

            await supabase.from("email_reminder_logs").insert({
              rent_payment_id: payment.id,
              template_key: tpl.template_key,
              recipient_email: tenant.email,
              organization_id: orgId,
              status: "sent",
            });
            totalSent++;
          } catch (sendErr) {
            console.error(`Send error for ${tenant.email}:`, sendErr);
            await supabase.from("email_reminder_logs").insert({
              rent_payment_id: payment.id,
              template_key: tpl.template_key,
              recipient_email: tenant.email,
              organization_id: orgId,
              status: "error",
              error_message: String(sendErr),
            });
            totalErrors++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, errors: totalErrors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Fatal error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
