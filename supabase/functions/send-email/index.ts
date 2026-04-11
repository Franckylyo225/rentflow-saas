const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "SCI Binieba <noreply@rent-flow.net>";

// HTML email templates
const templates: Record<string, (data: Record<string, any>) => { subject: string; html: string }> = {
  "signup-confirmation": (data) => ({
    subject: "Bienvenue sur SCI Binieba !",
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
        <div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Bienvenue sur SCI Binieba</h1>
        </div>
        <div style="padding:32px 24px">
          <p style="color:#1a1a2e;font-size:16px;line-height:1.6">Bonjour${data.name ? ` <strong>${data.name}</strong>` : ""},</p>
          <p style="color:#555;font-size:14px;line-height:1.6">Votre compte a été créé avec succès. Vous pouvez maintenant accéder à votre espace de gestion locative.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="https://rent-flow.net/dashboard" style="background:hsl(160,84%,39%);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Accéder à mon espace</a>
          </div>
          <p style="color:#999;font-size:12px;line-height:1.5">Si vous n'avez pas créé ce compte, vous pouvez ignorer cet email.</p>
        </div>
        <div style="background:#f8f8f8;padding:16px 24px;text-align:center">
          <p style="color:#999;font-size:11px;margin:0">© ${new Date().getFullYear()} SCI Binieba — Gestion locative simplifiée</p>
        </div>
      </div>
    `,
  }),

  "new-user-admin": (data) => ({
    subject: `Nouvel utilisateur : ${data.email || "inscription"}`,
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
        <div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Nouvelle inscription</h1>
        </div>
        <div style="padding:32px 24px">
          <p style="color:#1a1a2e;font-size:16px;line-height:1.6">Un nouvel utilisateur s'est inscrit sur la plateforme :</p>
          <div style="background:#f4faf7;border:1px solid hsl(160,60%,90%);border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:4px 0;color:#333;font-size:14px"><strong>Nom :</strong> ${data.name || "—"}</p>
            <p style="margin:4px 0;color:#333;font-size:14px"><strong>Email :</strong> ${data.email || "—"}</p>
            <p style="margin:4px 0;color:#333;font-size:14px"><strong>Organisation :</strong> ${data.organization || "—"}</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="https://rent-flow.net/admin/users" style="background:hsl(160,84%,39%);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Voir dans l'admin</a>
          </div>
        </div>
        <div style="background:#f8f8f8;padding:16px 24px;text-align:center">
          <p style="color:#999;font-size:11px;margin:0">SCI Binieba — Notification admin</p>
        </div>
      </div>
    `,
  }),

  "payment-confirmation": (data) => ({
    subject: `Paiement confirmé — ${data.amount || ""} FCFA`,
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
        <div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Paiement confirmé</h1>
        </div>
        <div style="padding:32px 24px">
          <p style="color:#1a1a2e;font-size:16px;line-height:1.6">Bonjour${data.name ? ` <strong>${data.name}</strong>` : ""},</p>
          <p style="color:#555;font-size:14px;line-height:1.6">Votre paiement a été enregistré avec succès.</p>
          <div style="background:#f4faf7;border:1px solid hsl(160,60%,90%);border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:4px 0;color:#333;font-size:14px"><strong>Plan :</strong> ${data.plan || "—"}</p>
            <p style="margin:4px 0;color:#333;font-size:14px"><strong>Montant :</strong> ${data.amount || "0"} FCFA</p>
            <p style="margin:4px 0;color:#333;font-size:14px"><strong>Période :</strong> ${data.period || "—"}</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="https://rent-flow.net/settings" style="background:hsl(160,84%,39%);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Voir mon abonnement</a>
          </div>
        </div>
        <div style="background:#f8f8f8;padding:16px 24px;text-align:center">
          <p style="color:#999;font-size:11px;margin:0">© ${new Date().getFullYear()} SCI Binieba — Gestion locative simplifiée</p>
        </div>
      </div>
    `,
  }),

  "payment-admin": (data) => ({
    subject: `Paiement reçu : ${data.organization || ""} — ${data.amount || "0"} FCFA`,
    html: `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
        <div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Paiement reçu</h1>
        </div>
        <div style="padding:32px 24px">
          <p style="color:#1a1a2e;font-size:16px;line-height:1.6">Un paiement d'abonnement a été enregistré :</p>
          <div style="background:#f4faf7;border:1px solid hsl(160,60%,90%);border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:4px 0;color:#333;font-size:14px"><strong>Organisation :</strong> ${data.organization || "—"}</p>
            <p style="margin:4px 0;color:#333;font-size:14px"><strong>Plan :</strong> ${data.plan || "—"}</p>
            <p style="margin:4px 0;color:#333;font-size:14px"><strong>Montant :</strong> ${data.amount || "0"} FCFA</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="https://rent-flow.net/admin/transactions" style="background:hsl(160,84%,39%);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Voir les transactions</a>
          </div>
        </div>
        <div style="background:#f8f8f8;padding:16px 24px;text-align:center">
          <p style="color:#999;font-size:11px;margin:0">SCI Binieba — Notification admin</p>
        </div>
      </div>
    `,
  }),
};

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

    const { templateName, recipientEmail, templateData, adminEmail } = await req.json();

    if (!templateName || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "templateName and recipientEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateFn = templates[templateName];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${templateName}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = templateFn(templateData || {});

    // Send to recipient
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
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also send admin notification if specified
    if (adminEmail && templates[`${templateName.replace("-confirmation", "-admin")}`]) {
      const adminTemplate = templates[`${templateName.replace("-confirmation", "-admin")}`];
      const adminContent = adminTemplate(templateData || {});
      
      await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [adminEmail],
          subject: adminContent.subject,
          html: adminContent.html,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
