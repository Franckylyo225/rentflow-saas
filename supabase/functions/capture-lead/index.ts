// Public lead capture — used by newsletter form on landing
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, full_name, phone, company, source } = await req.json();

    if (!email || typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Email invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const cleanEmail = String(email).trim().toLowerCase();
    const safeSource = (typeof source === "string" && source.length < 50) ? source : "landing";

    // Upsert: keep status if already converted
    const { data: existing } = await admin
      .from("marketing_contacts")
      .select("id,status")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      const newStatus = existing.status === "converted" ? "converted" : "new";
      await admin.from("marketing_contacts").update({
        full_name: full_name ? String(full_name).slice(0, 100) : undefined,
        phone: phone ? String(phone).slice(0, 30) : undefined,
        company: company ? String(company).slice(0, 100) : undefined,
        source: safeSource,
        status: newStatus,
        subscribed: true,
        last_activity_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await admin.from("marketing_contacts").insert({
        email: cleanEmail,
        full_name: full_name ? String(full_name).slice(0, 100) : null,
        phone: phone ? String(phone).slice(0, 30) : null,
        company: company ? String(company).slice(0, 100) : null,
        source: safeSource,
        status: "new",
        last_activity_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
