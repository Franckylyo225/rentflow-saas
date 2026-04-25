// Resend webhook receiver — captures bounces, complaints, deliveries, opens, clicks, unsubscribes.
// Verifies optional Svix signature when RESEND_WEBHOOK_SECRET is set.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");

async function verifySvix(req: Request, raw: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) return true; // signature optional
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const sig = req.headers.get("svix-signature");
  if (!id || !ts || !sig) return false;
  // Resend uses Svix; secret may be prefixed with "whsec_"
  const secret = WEBHOOK_SECRET.replace(/^whsec_/, "");
  const keyBytes = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const toSign = new TextEncoder().encode(`${id}.${ts}.${raw}`);
  const mac = await crypto.subtle.sign("HMAC", key, toSign);
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  // sig header = "v1,<b64>  v1,<b64>"
  return sig.split(" ").some((s) => s.split(",")[1] === expected);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const raw = await req.text();
  const valid = await verifySvix(req, raw).catch(() => false);
  if (!valid) {
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const type = String(event.type ?? "");
  const data = (event.data ?? {}) as Record<string, unknown>;
  const toRaw = data.to;
  const recipientEmails: string[] = Array.isArray(toRaw)
    ? (toRaw as string[])
    : typeof toRaw === "string"
      ? [toRaw]
      : [];
  const email = recipientEmails[0]?.toLowerCase() ?? null;
  const now = new Date().toISOString();

  // Find recipient + contact (latest match)
  let recipientId: string | null = null;
  let contactId: string | null = null;
  if (email) {
    const { data: rcpt } = await admin
      .from("campaign_recipients")
      .select("id, contact_id")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (rcpt) {
      recipientId = rcpt.id;
      contactId = rcpt.contact_id;
    }
    if (!contactId) {
      const { data: c } = await admin
        .from("marketing_contacts")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      contactId = c?.id ?? null;
    }
  }

  // Always log raw event
  await admin.from("email_webhook_events").insert({
    provider: "resend",
    event_type: type,
    email,
    recipient_id: recipientId,
    contact_id: contactId,
    payload: event,
  });

  const recipientPatch: Record<string, unknown> = {};
  const contactPatch: Record<string, unknown> = {};
  let bumpBounce = false;

  switch (type) {
    case "email.delivered": {
      recipientPatch.delivered_at = now;
      recipientPatch.status = "delivered";
      break;
    }
    case "email.opened": {
      // tracked via pixel already; harmless second source
      break;
    }
    case "email.clicked": {
      break;
    }
    case "email.bounced": {
      const bounce = (data.bounce ?? {}) as Record<string, unknown>;
      const subType = String(bounce.subType ?? bounce.type ?? "").toLowerCase();
      const bounceType = subType.includes("hard") || subType === "permanent" ? "hard" : "soft";
      recipientPatch.bounced_at = now;
      recipientPatch.bounce_type = bounceType;
      recipientPatch.status = "bounced";
      contactPatch.last_bounce_at = now;
      contactPatch.last_bounce_type = bounceType;
      bumpBounce = true;
      if (bounceType === "hard") {
        contactPatch.deliverability = "bad";
        contactPatch.subscribed = false;
      } else {
        contactPatch.deliverability = "risky";
      }
      break;
    }
    case "email.complained": {
      recipientPatch.complained_at = now;
      recipientPatch.status = "complained";
      contactPatch.complained_at = now;
      contactPatch.deliverability = "bad";
      contactPatch.subscribed = false;
      contactPatch.status = "unsubscribed";
      break;
    }
    case "email.unsubscribed":
    case "contact.unsubscribed": {
      recipientPatch.unsubscribed_at = now;
      contactPatch.unsubscribed_at = now;
      contactPatch.subscribed = false;
      contactPatch.status = "unsubscribed";
      break;
    }
    case "email.failed": {
      recipientPatch.status = "failed";
      recipientPatch.error_message = String((data as Record<string, unknown>).error ?? "failed").slice(0, 500);
      break;
    }
  }

  if (recipientId && Object.keys(recipientPatch).length) {
    await admin.from("campaign_recipients").update(recipientPatch).eq("id", recipientId);
  }
  if (contactId) {
    if (bumpBounce) {
      const { data: cur } = await admin
        .from("marketing_contacts")
        .select("bounce_count")
        .eq("id", contactId)
        .maybeSingle();
      contactPatch.bounce_count = (cur?.bounce_count ?? 0) + 1;
    }
    if (Object.keys(contactPatch).length) {
      await admin.from("marketing_contacts").update(contactPatch).eq("id", contactId);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
