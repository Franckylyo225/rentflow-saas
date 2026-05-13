// Edge function : envoie l'email de bienvenue early adopter via Resend.
// Le trigger SQL fait déjà l'attribution de la réduction. Cette fonction
// peut être appelée depuis le client après inscription pour envoyer l'email.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, email: bodyEmail, full_name } = await req.json().catch(() => ({}));
    if (!user_id && !bodyEmail) {
      return new Response(JSON.stringify({ error: "user_id or email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Récupération de la config + statut early adopter
    const { data: cfgRow } = await supabase.rpc("get_early_adopter_public_config");
    const cfg = (cfgRow ?? {}) as Record<string, string>;

    let isEarlyAdopter = false;
    let discount = Number(cfg.discount_percent || 25);
    let freeMonths = Number(cfg.free_months || 3);
    let recipientEmail = bodyEmail || "";

    if (user_id) {
      const { data: status } = await supabase.rpc("get_user_early_adopter_status", { _user_id: user_id });
      const s = (status ?? {}) as any;
      isEarlyAdopter = !!s.is_early_adopter;
      if (isEarlyAdopter) {
        discount = s.discount_percent ?? discount;
        freeMonths = s.free_months ?? freeMonths;
      }
      const { data: ea } = await supabase.from("early_adopters").select("email").eq("user_id", user_id).maybeSingle();
      if (ea?.email) recipientEmail = ea.email;
    }

    if (!isEarlyAdopter && !bodyEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "not_early_adopter" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalSlots = cfg.total_slots || "100";
    const priceBefore = Number(cfg.price_before || 20000);
    const priceAfter = Math.round(priceBefore * (1 - discount / 100));
    const freeUntil = new Date(Date.now() + freeMonths * 30 * 24 * 60 * 60 * 1000)
      .toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    const firstName = (full_name || "").split(" ")[0] || "";

    const subject = "Félicitations ! Vous êtes Early Adopter Rentflow — voici votre avantage";
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#0F2942;padding:28px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">🎉 Vous êtes Early Adopter !</h1>
        </div>
        <div style="padding:32px 24px;color:#1a1a2e;line-height:1.6">
          <p>Bonjour${firstName ? " " + firstName : ""},</p>
          <p>Vous faites partie des <strong>${totalSlots} premiers utilisateurs</strong> de Rentflow.</p>
          <div style="background:#ECFDF5;border-left:4px solid #22C55E;padding:16px;border-radius:8px;margin:20px 0">
            <p style="margin:0 0 6px;font-weight:bold;color:#166534">Votre réduction : -${discount}% à vie</p>
            <p style="margin:0">soit <strong>${priceAfter.toLocaleString("fr-FR")} FCFA/mois</strong>
            au lieu de <span style="text-decoration:line-through;color:#999">${priceBefore.toLocaleString("fr-FR")} FCFA</span>.</p>
          </div>
          <p><strong>${freeMonths} mois offerts</strong> — aucun paiement avant le ${freeUntil}.</p>
          <p style="color:#555;font-size:13px">Cette réduction est permanente et ne peut pas être perdue tant que vous restez abonné.</p>
          <div style="text-align:center;margin:32px 0">
            <a href="https://rentflow-net.lovable.app/dashboard"
              style="background:#22C55E;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;display:inline-block;font-weight:bold">
              Accéder à mon compte →
            </a>
          </div>
          <p style="color:#999;font-size:12px;margin-top:32px">— L'équipe Rentflow</p>
        </div>
      </div>`;

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!lovableKey || !resendKey) {
      return new Response(JSON.stringify({ error: "Email gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const r = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: "Rentflow <onboarding@resend.dev>",
        to: [recipientEmail],
        subject,
        html,
      }),
    });
    const result = await r.json();

    return new Response(JSON.stringify({ success: r.ok, result }), {
      status: r.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
