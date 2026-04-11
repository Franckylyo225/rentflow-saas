const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "RentFlow <noreply@rent-flow.net>";

// Fallback templates (used if DB fetch fails)
const fallbackTemplates: Record<string, (data: Record<string, any>) => { subject: string; html: string }> = {
  "signup-confirmation": (data) => ({
    subject: "Bienvenue sur SCI Binieba !",
    html: `<div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Bienvenue sur SCI Binieba</h1></div><div style="padding:32px 24px"><p style="color:#1a1a2e;font-size:16px;line-height:1.6">Bonjour${data.name ? ` <strong>${data.name}</strong>` : ""},</p><p style="color:#555;font-size:14px;line-height:1.6">Votre compte a été créé avec succès.</p></div></div>`,
  }),
  "new-user-admin": (data) => ({
    subject: `Nouvel utilisateur : ${data.email || "inscription"}`,
    html: `<div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Nouvelle inscription</h1></div><div style="padding:32px 24px"><p>Nom: ${data.name || "—"}</p><p>Email: ${data.email || "—"}</p></div></div>`,
  }),
  "payment-confirmation": (data) => ({
    subject: `Paiement confirmé — ${data.amount || ""} FCFA`,
    html: `<div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Paiement confirmé</h1></div><div style="padding:32px 24px"><p>Plan: ${data.plan || "—"}</p><p>Montant: ${data.amount || "0"} FCFA</p></div></div>`,
  }),
  "payment-admin": (data) => ({
    subject: `Paiement reçu : ${data.organization || ""} — ${data.amount || "0"} FCFA`,
    html: `<div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Paiement reçu</h1></div><div style="padding:32px 24px"><p>Organisation: ${data.organization || "—"}</p><p>Montant: ${data.amount || "0"} FCFA</p></div></div>`,
  }),
};

// Replace {{variable}} placeholders in HTML/subject
function replaceVariables(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : "—";
  });
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

    const { templateName, recipientEmail, templateData, adminEmail } = await req.json();

    if (!templateName || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "templateName and recipientEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to fetch template from DB
    let subject: string;
    let html: string;
    let useDb = false;

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: dbTemplate } = await supabase
        .from("platform_email_templates")
        .select("subject, html_content, is_active")
        .eq("template_key", templateName)
        .maybeSingle();

      if (dbTemplate && dbTemplate.is_active) {
        subject = replaceVariables(dbTemplate.subject, templateData || {});
        html = replaceVariables(dbTemplate.html_content, templateData || {});
        useDb = true;
      }
    } catch (dbErr) {
      console.error("DB template fetch failed, using fallback:", dbErr);
    }

    // Fallback to hardcoded templates
    if (!useDb) {
      const templateFn = fallbackTemplates[templateName];
      if (!templateFn) {
        return new Response(
          JSON.stringify({ error: `Unknown template: ${templateName}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const result = templateFn(templateData || {});
      subject = result.subject;
      html = result.html;
    }

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
        subject: subject!,
        html: html!,
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
    if (adminEmail) {
      const adminTemplateKey = templateName.replace("-confirmation", "-admin");
      let adminSubject: string | undefined;
      let adminHtml: string | undefined;

      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: adminDbTemplate } = await supabase
          .from("platform_email_templates")
          .select("subject, html_content, is_active")
          .eq("template_key", adminTemplateKey)
          .maybeSingle();

        if (adminDbTemplate && adminDbTemplate.is_active) {
          adminSubject = replaceVariables(adminDbTemplate.subject, templateData || {});
          adminHtml = replaceVariables(adminDbTemplate.html_content, templateData || {});
        }
      } catch (_) {}

      if (!adminSubject && fallbackTemplates[adminTemplateKey]) {
        const adminResult = fallbackTemplates[adminTemplateKey](templateData || {});
        adminSubject = adminResult.subject;
        adminHtml = adminResult.html;
      }

      if (adminSubject && adminHtml) {
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
            subject: adminSubject,
            html: adminHtml,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id, source: useDb ? "database" : "fallback" }),
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
