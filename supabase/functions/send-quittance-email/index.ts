const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "RentFlow <noreply@rent-flow.net>";

function buildHtml(data: {
  tenantName: string;
  month: string;
  amount: number;
  organizationName?: string;
}): string {
  const formattedAmount = data.amount.toLocaleString("fr-FR").replace(/\u00A0|\u202F/g, " ");
  const orgName = data.organizationName || "votre agence";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f7f5;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
    <div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center">
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700">Quittance de loyer</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px">${data.month}</p>
    </div>
    <div style="padding:32px 24px;color:#1a1a2e;font-size:14px;line-height:1.6">
      <p>Bonjour <strong>${data.tenantName}</strong>,</p>
      <p>Nous accusons réception de votre paiement de loyer pour le mois de <strong>${data.month}</strong>.</p>
      <div style="background:#f0f8f4;border-left:4px solid hsl(160,84%,39%);padding:16px;margin:24px 0;border-radius:4px">
        <p style="margin:0;color:#555;font-size:13px">Montant réglé</p>
        <p style="margin:4px 0 0;font-size:20px;font-weight:700;color:hsl(160,84%,39%)">${formattedAmount} FCFA</p>
      </div>
      <p>Vous trouverez votre <strong>quittance officielle en pièce jointe</strong> au format PDF.</p>
      <p>Merci pour la confiance que vous nous accordez.</p>
      <p style="margin-top:32px;color:#555">Cordialement,<br/><strong>${orgName}</strong></p>
    </div>
    <div style="background:#f4f7f5;padding:16px 24px;text-align:center;color:#888;font-size:12px">
      Email automatique — Merci de ne pas y répondre.
    </div>
  </div>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Missing API keys");
    }

    const {
      recipientEmail,
      tenantName,
      month,
      amount,
      organizationName,
      pdfBase64,
      pdfFilename,
      organizationId,
      rentPaymentId,
    } = await req.json();

    if (!recipientEmail || !pdfBase64 || !month) {
      return new Response(
        JSON.stringify({ error: "recipientEmail, pdfBase64 and month are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = `Votre quittance de loyer — ${month}`;
    const html = buildHtml({ tenantName: tenantName || "", month, amount: amount || 0, organizationName });
    const filename = pdfFilename || `Quittance_${month}.pdf`;

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [recipientEmail],
        subject,
        html,
        attachments: [{ filename, content: pdfBase64 }],
      }),
    });

    const result = await response.json();

    // Log the send attempt
    if (organizationId && rentPaymentId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from("email_reminder_logs").insert({
          organization_id: organizationId,
          rent_payment_id: rentPaymentId,
          recipient_email: recipientEmail,
          template_key: "quittance_auto",
          status: response.ok ? "sent" : "failed",
          error_message: response.ok ? null : JSON.stringify(result).slice(0, 500),
        });
      } catch (logErr) {
        console.error("Failed to log email:", logErr);
      }
    }

    if (!response.ok) {
      console.error("Resend error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-quittance-email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
