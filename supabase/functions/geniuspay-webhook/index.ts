// Edge Function: geniuspay-webhook
// Reçoit les notifications de paiement GeniusPay, vérifie la signature HMAC,
// met à jour la transaction et active l'abonnement si succès.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-webhook-signature, x-webhook-timestamp, x-webhook-event, x-webhook-environment",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("GENIUSPAY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!webhookSecret) {
      console.error("GENIUSPAY_WEBHOOK_SECRET not set");
      return new Response("Server misconfigured", { status: 500, headers: corsHeaders });
    }

    const signature = req.headers.get("x-webhook-signature") || "";
    const timestamp = req.headers.get("x-webhook-timestamp") || "";
    const event = req.headers.get("x-webhook-event") || "";
    const environment = req.headers.get("x-webhook-environment") || "sandbox";
    const rawBody = await req.text();

    if (!signature || !timestamp) {
      return new Response("Missing signature headers", { status: 401, headers: corsHeaders });
    }

    // Replay protection (5 min)
    const tsNum = Number(timestamp);
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
      return new Response("Timestamp too old", { status: 400, headers: corsHeaders });
    }

    // HMAC SHA256 over `${timestamp}.${rawBody}`
    const expected = createHmac("sha256", webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    // Constant-time compare
    if (
      expected.length !== signature.length ||
      !timingSafeEqual(expected, signature)
    ) {
      console.warn("Invalid signature", { event, environment });
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    const payload = JSON.parse(rawBody);
    const data = payload?.data || {};
    const reference: string | undefined = data.reference;

    if (!reference) {
      return new Response("No reference", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find the transaction
    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("id, organization_id, plan_slug, status, purpose")
      .eq("reference", reference)
      .maybeSingle();

    if (!tx) {
      console.warn("Transaction not found:", reference);
      // Still return 200 so GeniusPay doesn't keep retrying
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Map event → status
    let newStatus = tx.status;
    let completedAt: string | null = null;
    switch (event) {
      case "payment.success":
        newStatus = "completed";
        completedAt = new Date().toISOString();
        break;
      case "payment.failed":
        newStatus = "failed";
        break;
      case "payment.cancelled":
        newStatus = "cancelled";
        break;
      case "payment.expired":
        newStatus = "expired";
        break;
      case "payment.refunded":
        newStatus = "refunded";
        break;
      default:
        // initiated, processing, etc. → keep
        break;
    }

    await supabase
      .from("payment_transactions")
      .update({
        status: newStatus,
        environment,
        webhook_payload: payload,
        completed_at: completedAt ?? undefined,
      })
      .eq("id", tx.id);

    // On successful subscription payment → activate plan
    if (
      newStatus === "completed" &&
      tx.purpose === "subscription" &&
      tx.plan_slug
    ) {
      const periodStart = new Date();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Upsert subscription
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("organization_id", tx.organization_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("subscriptions")
          .update({
            plan: tx.plan_slug,
            status: "active",
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            trial_ends_at: null,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("subscriptions").insert({
          organization_id: tx.organization_id,
          plan: tx.plan_slug,
          status: "active",
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});

function timingSafeEqual(a: string, b: string): boolean {
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
