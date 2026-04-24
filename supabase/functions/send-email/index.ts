const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "RentFlow <noreply@rent-flow.net>";
const MAX_RETRIES = 2;
const LOGO_BASE = "https://dljpgpplvqhhfndpsihz.supabase.co/storage/v1/object/public/logos/platform";
const LOGO_WHITE_URL = `${LOGO_BASE}%2Frentflow-logo-white.png`;
const LOGO_COLOR_URL = `${LOGO_BASE}%2Frentflow-logo.png`;
const LOGO_CONFIG_URL = `${LOGO_BASE}%2Femail-logo-config.json`;

async function resolveLogoUrl(): Promise<string> {
  try {
    const r = await fetch(`${LOGO_CONFIG_URL}?t=${Date.now()}`, { cache: "no-store" as RequestCache });
    if (!r.ok) return LOGO_WHITE_URL;
    const cfg = await r.json();
    return cfg?.variant === "color" ? LOGO_COLOR_URL : LOGO_WHITE_URL;
  } catch {
    return LOGO_WHITE_URL;
  }
}

function buildLogoImg(url: string): string {
  return `<img src="${url}" alt="RentFlow" height="36" style="display:block;margin:0 auto 12px;max-height:36px;width:auto;border:0;outline:none;text-decoration:none" />`;
}

// Defaults used by fallbackTemplates declaration; overridden per-request below.
let LOGO_URL = LOGO_WHITE_URL;
let LOGO_IMG = buildLogoImg(LOGO_URL);

// Fallback templates (used if DB fetch fails)
const fallbackTemplates: Record<string, (data: Record<string, any>) => { subject: string; html: string }> = {
  "signup-confirmation": (data) => ({
    subject: "Bienvenue sur RentFlow !",
    html: `<div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center">${LOGO_IMG}<h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Bienvenue sur RentFlow</h1></div><div style="padding:32px 24px"><p style="color:#1a1a2e;font-size:16px;line-height:1.6">Bonjour${data.name ? ` <strong>${data.name}</strong>` : ""},</p><p style="color:#555;font-size:14px;line-height:1.6">Votre compte a été créé avec succès.</p></div></div>`,
  }),
  "new-user-admin": (data) => ({
    subject: `Nouvel utilisateur : ${data.email || "inscription"}`,
    html: `<div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center">${LOGO_IMG}<h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Nouvelle inscription</h1></div><div style="padding:32px 24px"><p>Nom: ${data.name || "—"}</p><p>Email: ${data.email || "—"}</p></div></div>`,
  }),
  "payment-confirmation": (data) => ({
    subject: `Paiement confirmé — ${data.amount || ""} FCFA`,
    html: `<div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center">${LOGO_IMG}<h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Paiement confirmé</h1></div><div style="padding:32px 24px"><p>Plan: ${data.plan || "—"}</p><p>Montant: ${data.amount || "0"} FCFA</p></div></div>`,
  }),
  "payment-admin": (data) => ({
    subject: `Paiement reçu : ${data.organization || ""} — ${data.amount || "0"} FCFA`,
    html: `<div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center">${LOGO_IMG}<h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Paiement reçu</h1></div><div style="padding:32px 24px"><p>Organisation: ${data.organization || "—"}</p><p>Montant: ${data.amount || "0"} FCFA</p></div></div>`,
  }),
};

function replaceVariables(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return data[key] !== undefined && data[key] !== null ? String(data[key]) : "—";
  });
}

async function sendWithRetry(payload: any, headers: Record<string, string>): Promise<{ ok: boolean; result: any; retries: number }> {
  let lastResult: any = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const r = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const result = await r.json();
      if (r.ok) return { ok: true, result, retries: attempt };
      lastResult = result;
      // exponential backoff
      if (attempt < MAX_RETRIES) await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
    } catch (err) {
      lastResult = { error: err instanceof Error ? err.message : String(err) };
      if (attempt < MAX_RETRIES) await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
    }
  }
  return { ok: false, result: lastResult, retries: MAX_RETRIES };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let logTemplateKey = "";
  let logRecipient = "";
  let logSubject = "";
  let logContext: Record<string, any> = {};
  let logOrgId: string | null = null;
  let logUserId: string | null = null;

  async function writeLog(status: string, errorMessage: string | null, retries: number) {
    try {
      await supabase.from("platform_email_logs").insert({
        template_key: logTemplateKey || "unknown",
        recipient_email: logRecipient || "unknown",
        subject: logSubject,
        status,
        error_message: errorMessage,
        retry_count: retries,
        organization_id: logOrgId,
        user_id: logUserId,
        context: logContext,
      });
    } catch (logErr) {
      console.error("Failed to write platform_email_logs:", logErr);
    }
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Missing API keys");
    }

    // Resolve which logo variant (white/color) to use for this send
    LOGO_URL = await resolveLogoUrl();
    LOGO_IMG = buildLogoImg(LOGO_URL);
    const swapLogo = (s: string) =>
      s.replaceAll(LOGO_WHITE_URL, LOGO_URL).replaceAll(LOGO_COLOR_URL, LOGO_URL);

    const { templateName, recipientEmail, templateData, adminEmail, inlineSubject, inlineHtml, organizationId, userId } =
      await req.json();

    if (!templateName || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "templateName and recipientEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logTemplateKey = templateName;
    logRecipient = recipientEmail;
    logContext = templateData || {};
    logOrgId = organizationId || null;
    logUserId = userId || null;

    let subject: string;
    let html: string;
    let useDb = false;

    // Inline mode: caller provides subject + html directly (used by relance emails)
    if (templateName === "__inline__") {
      if (!inlineSubject || !inlineHtml) {
        return new Response(
          JSON.stringify({ error: "inlineSubject and inlineHtml are required for inline mode" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      subject = replaceVariables(inlineSubject, templateData || {});
      html = replaceVariables(inlineHtml, templateData || {});
    } else {
      // Try to fetch template from DB and check is_active
      try {
        const { data: dbTemplate } = await supabase
          .from("platform_email_templates")
          .select("subject, html_content, is_active")
          .eq("template_key", templateName)
          .maybeSingle();

        if (dbTemplate) {
          if (!dbTemplate.is_active) {
            await writeLog("disabled", "Template désactivé par l'administrateur", 0);
            return new Response(
              JSON.stringify({ success: false, skipped: true, reason: "template_disabled" }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          subject = replaceVariables(dbTemplate.subject, templateData || {});
          html = replaceVariables(dbTemplate.html_content, templateData || {});
          useDb = true;
        }
      } catch (dbErr) {
        console.error("DB template fetch failed, using fallback:", dbErr);
      }

      if (!useDb) {
        const templateFn = fallbackTemplates[templateName];
        if (!templateFn) {
          await writeLog("failed", `Unknown template: ${templateName}`, 0);
          return new Response(
            JSON.stringify({ error: `Unknown template: ${templateName}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const result = templateFn(templateData || {});
        subject = result.subject;
        html = result.html;
      }
    }

    logSubject = subject!;
    html = swapLogo(html!);

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    };

    const { ok, result, retries } = await sendWithRetry(
      { from: FROM_EMAIL, to: [recipientEmail], subject: subject!, html: html! },
      headers
    );

    if (!ok) {
      const errMsg = typeof result === "object" ? JSON.stringify(result) : String(result);
      await writeLog("failed", errMsg.slice(0, 500), retries);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await writeLog("sent", null, retries);

    // Admin notification (mirror)
    if (adminEmail) {
      const adminTemplateKey = templateName.replace("-confirmation", "-admin");
      let adminSubject: string | undefined;
      let adminHtml: string | undefined;
      let adminEnabled = true;

      try {
        const { data: adminDbTemplate } = await supabase
          .from("platform_email_templates")
          .select("subject, html_content, is_active")
          .eq("template_key", adminTemplateKey)
          .maybeSingle();

        if (adminDbTemplate) {
          adminEnabled = adminDbTemplate.is_active;
          if (adminEnabled) {
            adminSubject = replaceVariables(adminDbTemplate.subject, templateData || {});
            adminHtml = replaceVariables(adminDbTemplate.html_content, templateData || {});
          }
        }
      } catch (_) {}

      if (!adminSubject && fallbackTemplates[adminTemplateKey] && adminEnabled) {
        const adminResult = fallbackTemplates[adminTemplateKey](templateData || {});
        adminSubject = adminResult.subject;
        adminHtml = adminResult.html;
      }

      if (adminSubject && adminHtml && adminEnabled) {
        adminHtml = swapLogo(adminHtml);
        const { ok: aOk, result: aResult, retries: aRetries } = await sendWithRetry(
          { from: FROM_EMAIL, to: [adminEmail], subject: adminSubject, html: adminHtml },
          headers
        );
        try {
          await supabase.from("platform_email_logs").insert({
            template_key: adminTemplateKey,
            recipient_email: adminEmail,
            subject: adminSubject,
            status: aOk ? "sent" : "failed",
            error_message: aOk ? null : (typeof aResult === "object" ? JSON.stringify(aResult).slice(0, 500) : String(aResult)),
            retry_count: aRetries,
            organization_id: logOrgId,
            user_id: logUserId,
            context: logContext,
          });
        } catch (_) {}
      }
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id, source: useDb ? "database" : "fallback", retries }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-email error:", error);
    const msg = error instanceof Error ? error.message : "Erreur interne";
    await writeLog("failed", msg.slice(0, 500), 0);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
