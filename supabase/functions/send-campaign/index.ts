// Send marketing campaign — admin-triggered
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "RentFlow <noreply@rent-flow.net>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const PUBLIC_FN_BASE = `${SUPABASE_URL}/functions/v1`;

function replaceVars(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

function instrumentHtml(html: string, recipientId: string, campaignId: string): string {
  // Rewrite all <a href="..."> through track-click
  const rewritten = html.replace(/href="(https?:\/\/[^"]+)"/g, (_, url) => {
    const wrapped = `${PUBLIC_FN_BASE}/track-click?r=${recipientId}&c=${campaignId}&u=${encodeURIComponent(url)}`;
    return `href="${wrapped}"`;
  });
  // Append tracking pixel
  const pixel = `<img src="${PUBLIC_FN_BASE}/track-open?r=${recipientId}&c=${campaignId}" width="1" height="1" style="display:none" alt="" />`;
  return rewritten + pixel;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is super admin
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: isAdmin } = await admin.rpc("is_super_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load campaign
    const { data: campaign, error: cErr } = await admin
      .from("marketing_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .maybeSingle();
    if (cErr || !campaign) throw new Error(cErr?.message || "campaign not found");
    if (campaign.status === "sending" || campaign.status === "sent") {
      return new Response(JSON.stringify({ error: "campaign already processed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve audience based on segment_filter
    const filter = (campaign.segment_filter ?? {}) as { statuses?: string[]; sources?: string[]; subscribed_only?: boolean };
    let q = admin.from("marketing_contacts").select("id,email,full_name,company").eq("subscribed", true);
    if (filter.statuses && filter.statuses.length) q = q.in("status", filter.statuses);
    if (filter.sources && filter.sources.length) q = q.in("source", filter.sources);
    const { data: contacts, error: ctErr } = await q;
    if (ctErr) throw ctErr;
    const audience = (contacts ?? []).filter(c => c.email);

    // Mark sending + total
    await admin.from("marketing_campaigns").update({
      status: "sending",
      total_recipients: audience.length,
    }).eq("id", campaign_id);

    let sent = 0, failed = 0;

    for (const contact of audience) {
      // Upsert recipient row
      const { data: recipient, error: rErr } = await admin
        .from("campaign_recipients")
        .upsert({
          campaign_id,
          contact_id: contact.id,
          email: contact.email,
          status: "pending",
        }, { onConflict: "campaign_id,contact_id" })
        .select("id")
        .maybeSingle();
      if (rErr || !recipient) { failed++; continue; }

      const vars = {
        name: contact.full_name ?? "",
        first_name: (contact.full_name ?? "").split(" ")[0] ?? "",
        email: contact.email,
        company: contact.company ?? "",
      };
      const subject = replaceVars(campaign.subject, vars);
      const html = instrumentHtml(replaceVars(campaign.html_content, vars), recipient.id, campaign_id);

      try {
        const r = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [contact.email],
            subject,
            html,
          }),
        });
        const body = await r.json().catch(() => ({}));
        if (r.ok) {
          sent++;
          await admin.from("campaign_recipients").update({
            status: "sent", sent_at: new Date().toISOString(),
          }).eq("id", recipient.id);
        } else {
          failed++;
          await admin.from("campaign_recipients").update({
            status: "failed", error_message: JSON.stringify(body).slice(0, 500),
          }).eq("id", recipient.id);
        }
      } catch (e) {
        failed++;
        await admin.from("campaign_recipients").update({
          status: "failed", error_message: String(e).slice(0, 500),
        }).eq("id", recipient.id);
      }
      // Small delay to smooth rate
      await new Promise(r => setTimeout(r, 80));
    }

    await admin.from("marketing_campaigns").update({
      status: failed === audience.length && audience.length > 0 ? "failed" : "sent",
      total_sent: sent,
      total_failed: failed,
      sent_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    return new Response(JSON.stringify({ success: true, sent, failed, total: audience.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
