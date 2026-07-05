import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_RETRIES = 3;
const BATCH_SIZE = 50;

async function assertCronCaller(req: Request): Promise<Response | null> {
  const expected = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (expected && provided && provided === expected) return null;
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token) {
    try {
      const svc = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: userData } = await svc.auth.getUser(token);
      if (userData?.user) {
        const { data: isAdmin } = await svc.rpc("is_super_admin", { _user_id: userData.user.id });
        if (isAdmin === true) return null;
      }
    } catch { /* fallthrough */ }
  }
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const denied = await assertCronCaller(req);
  if (denied) return denied;


  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const nowIso = new Date().toISOString();

    // Fetch up to BATCH_SIZE messages that are due
    const { data: due, error } = await supabase
      .from("sms_messages")
      .select("id, retry_count, status")
      .in("status", ["scheduled"])
      .lte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) throw error;
    if (!due || due.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[sms-process-queue] processing ${due.length} messages`);

    let sent = 0;
    let failed = 0;

    for (const msg of due) {
      // Mark as sending to avoid double-pickup
      await supabase
        .from("sms_messages")
        .update({ status: "sending" })
        .eq("id", msg.id);

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/sms-send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ sms_message_id: msg.id }),
        });
        const data = await res.json();
        if (data?.success) {
          sent++;
        } else {
          failed++;
          // Increment retry count, re-schedule or mark failed
          const nextRetry = (msg.retry_count ?? 0) + 1;
          const newStatus = nextRetry >= MAX_RETRIES ? "failed" : "scheduled";
          // Backoff: retry in N*15 minutes
          const nextSchedule = new Date(Date.now() + nextRetry * 15 * 60 * 1000).toISOString();
          await supabase
            .from("sms_messages")
            .update({
              status: newStatus,
              retry_count: nextRetry,
              scheduled_for: newStatus === "scheduled" ? nextSchedule : undefined,
            })
            .eq("id", msg.id);
        }
      } catch (err) {
        failed++;
        const nextRetry = (msg.retry_count ?? 0) + 1;
        const newStatus = nextRetry >= MAX_RETRIES ? "failed" : "scheduled";
        await supabase
          .from("sms_messages")
          .update({
            status: newStatus,
            retry_count: nextRetry,
            error_message: String(err),
          })
          .eq("id", msg.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: due.length, sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sms-process-queue] error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
