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
        JSON.stringify({ error: "Champs requis manquants (destinataire, PDF ou mois).", code: "missing_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validation basique du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return new Response(
        JSON.stringify({
          error: `L'adresse email "${recipientEmail}" est invalide.`,
          code: "invalid_email",
        }),
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
      // Traduit les erreurs Resend les plus courantes en messages lisibles
      const resendMessage: string =
        result?.message || result?.error?.message || result?.error || "";
      const resendName: string = result?.name || result?.error?.name || "";
      let userMessage = "Le service d'envoi d'email est indisponible. Réessayez dans quelques minutes.";
      let code = "service_unavailable";

      if (
        response.status === 422 ||
        /invalid.*to|invalid.*recipient|invalid.*email/i.test(resendMessage)
      ) {
        userMessage = `L'adresse email "${recipientEmail}" est invalide ou a été refusée par le service.`;
        code = "invalid_email";
      } else if (response.status === 401 || response.status === 403) {
        userMessage = "Configuration email invalide. Contactez l'administrateur.";
        code = "auth_error";
      } else if (response.status === 429) {
        userMessage = "Trop d'envois en peu de temps. Patientez puis réessayez.";
        code = "rate_limited";
      } else if (response.status === 413 || /too large|payload/i.test(resendMessage)) {
        userMessage = "Le PDF est trop volumineux pour être envoyé par email.";
        code = "payload_too_large";
      } else if (resendMessage) {
        userMessage = `Échec de l'envoi : ${resendMessage}`;
      }

      return new Response(
        JSON.stringify({
          error: userMessage,
          code,
          provider_status: response.status,
          provider_name: resendName || undefined,
        }),
        { status: response.status >= 400 && response.status < 500 ? response.status : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-quittance-email error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: "Erreur interne lors de l'envoi de l'email. Réessayez plus tard.",
        code: "internal_error",
        details: message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
