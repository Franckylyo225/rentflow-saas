import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FROM = "Loca.ci <noreply@rent-flow.net>";

function buildHtml(resetUrl: string) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#f5f7fa;font-family:Inter,Arial,sans-serif;color:#1a1a2e">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:linear-gradient(135deg,hsl(160,84%,39%),hsl(160,84%,32%));padding:28px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700">Loca.ci</h1>
      <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px">Gestion locative simplifiée</p>
    </div>
    <div style="padding:36px 28px">
      <h2 style="margin:0 0 12px;font-size:20px">Réinitialisation de votre mot de passe</h2>
      <p style="line-height:1.6;color:#475569">
        Vous avez demandé à réinitialiser votre mot de passe Loca.ci. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable pendant 1 heure.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${resetUrl}" style="display:inline-block;background:hsl(160,84%,39%);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600">Réinitialiser mon mot de passe</a>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.6">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <a href="${resetUrl}" style="color:hsl(160,84%,32%);word-break:break-all">${resetUrl}</a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0"/>
      <p style="color:#94a3b8;font-size:12px;line-height:1.5">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email — votre mot de passe restera inchangé.
      </p>
    </div>
    <div style="background:#f8fafc;padding:18px;text-align:center;color:#94a3b8;font-size:12px">
      © ${new Date().getFullYear()} Loca.ci · rent-flow.net
    </div>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    const { email, redirectTo } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Generate recovery link via admin API
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: redirectTo || undefined },
    });

    if (error) {
      console.error("generateLink error:", error);
      // Always return success to avoid user enumeration
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionLink = data?.properties?.action_link;
    if (!actionLink) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Resend
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: "Réinitialisation de votre mot de passe Loca.ci",
        html: buildHtml(actionLink),
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error("Resend error:", resp.status, body);
      return new Response(JSON.stringify({ error: "Échec de l'envoi" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-password-reset error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
