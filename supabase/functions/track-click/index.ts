// Click tracking — logs the click then redirects (302)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const recipientId = url.searchParams.get("r");
  const campaignId = url.searchParams.get("c");
  const target = url.searchParams.get("u");

  const safeTarget = target && /^https?:\/\//i.test(target) ? target : "https://rent-flow.net";

  if (recipientId && campaignId) {
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await admin.from("campaign_events").insert({
        recipient_id: recipientId,
        campaign_id: campaignId,
        event_type: "click",
        url: safeTarget,
        user_agent: req.headers.get("user-agent")?.slice(0, 250),
      });

      const { data: recipient } = await admin
        .from("campaign_recipients")
        .select("first_clicked_at, click_count")
        .eq("id", recipientId)
        .maybeSingle();

      const isFirst = recipient && !recipient.first_clicked_at;
      await admin.from("campaign_recipients").update({
        first_clicked_at: recipient?.first_clicked_at ?? new Date().toISOString(),
        click_count: (recipient?.click_count ?? 0) + 1,
      }).eq("id", recipientId);

      if (isFirst) {
        const { data: c } = await admin.from("marketing_campaigns").select("total_clicked").eq("id", campaignId).maybeSingle();
        await admin.from("marketing_campaigns").update({ total_clicked: (c?.total_clicked ?? 0) + 1 }).eq("id", campaignId);
      }
    } catch (_) { /* swallow */ }
  }

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: safeTarget },
  });
});
