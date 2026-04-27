// Edge Function: geniuspay-create-payment
// Crée une session de paiement GeniusPay (page de checkout hébergée)
// pour la souscription/upgrade d'abonnement RentFlow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GENIUSPAY_BASE_URL = "https://pay.genius.ci/api/v1/merchant";

interface CreatePaymentBody {
  plan_slug: string;
  amount: number;
  billing_cycle?: "monthly" | "yearly";
  success_url?: string;
  error_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GENIUSPAY_API_KEY");
    const apiSecret = Deno.env.get("GENIUSPAY_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: "GeniusPay API keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    // Service role for DB writes
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load profile + org
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, full_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CreatePaymentBody = await req.json();

    if (!body.plan_slug || !body.amount || body.amount < 200) {
      return new Response(
        JSON.stringify({ error: "plan_slug and amount (>=200) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify plan exists
    const { data: plan } = await supabase
      .from("plans")
      .select("slug, name, price_monthly")
      .eq("slug", body.plan_slug)
      .maybeSingle();

    if (!plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "") ||
      "https://app.lovable.dev";

    // Call GeniusPay
    const gpRes = await fetch(`${GENIUSPAY_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: body.amount,
        currency: "XOF",
        description: `Abonnement RentFlow - ${plan.name}`,
        customer: {
          name: profile.full_name || user.email,
          email: profile.email || user.email,
        },
        success_url: body.success_url ||
          `${origin}/settings?tab=subscription&payment=success`,
        error_url: body.error_url ||
          `${origin}/settings?tab=subscription&payment=error`,
        metadata: {
          organization_id: profile.organization_id,
          user_id: user.id,
          plan_slug: plan.slug,
          purpose: "subscription",
        },
      }),
    });

    const gpData = await gpRes.json();

    if (!gpRes.ok || !gpData?.success) {
      console.error("GeniusPay error:", gpData);
      return new Response(
        JSON.stringify({
          error: "GeniusPay rejected the request",
          details: gpData,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tx = gpData.data;

    // Persist transaction
    const { error: insertErr } = await supabase.from("payment_transactions").insert({
      organization_id: profile.organization_id,
      user_id: user.id,
      provider: "geniuspay",
      reference: tx.reference,
      provider_transaction_id: String(tx.id ?? ""),
      amount: body.amount,
      currency: "XOF",
      status: tx.status || "pending",
      environment: tx.environment || "sandbox",
      purpose: "subscription",
      plan_slug: plan.slug,
      checkout_url: tx.checkout_url || tx.payment_url,
      metadata: { plan_name: plan.name },
    });

    if (insertErr) {
      console.error("Insert error:", insertErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reference: tx.reference,
        checkout_url: tx.checkout_url || tx.payment_url,
        environment: tx.environment,
        amount: body.amount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Unhandled error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
