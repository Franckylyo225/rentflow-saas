// Tracking pixel — returns 1x1 transparent gif and logs open
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const PIXEL = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0)
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const recipientId = url.searchParams.get("r");
  const campaignId = url.searchParams.get("c");

  if (recipientId && campaignId) {
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Insert event
      await admin.from("campaign_events").insert({
        recipient_id: recipientId,
        campaign_id: campaignId,
        event_type: "open",
        user_agent: req.headers.get("user-agent")?.slice(0, 250),
      });

      // Fetch recipient to know if first open
      const { data: recipient } = await admin
        .from("campaign_recipients")
        .select("first_opened_at, open_count")
        .eq("id", recipientId)
        .maybeSingle();

      const isFirst = recipient && !recipient.first_opened_at;
      await admin.from("campaign_recipients").update({
        first_opened_at: recipient?.first_opened_at ?? new Date().toISOString(),
        open_count: (recipient?.open_count ?? 0) + 1,
      }).eq("id", recipientId);

      if (isFirst) {
        await admin.rpc("increment_campaign_open", { _campaign_id: campaignId }).then(
          () => {},
          async () => {
            // Fallback: manual increment
            const { data: c } = await admin.from("marketing_campaigns").select("total_opened").eq("id", campaignId).maybeSingle();
            await admin.from("marketing_campaigns").update({ total_opened: (c?.total_opened ?? 0) + 1 }).eq("id", campaignId);
          }
        );
      }
    } catch (_) { /* swallow — must always return pixel */ }
  }

  return new Response(PIXEL, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
});
