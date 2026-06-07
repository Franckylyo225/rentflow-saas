import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONSMS_BASE_URL = "https://rest.monsms.pro/v1";

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.()]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
  return cleaned;
}

function renderTemplate(content: string, vars: Record<string, string>): string {
  let out = content;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), v ?? "");
  }
  return out;
}

interface SendBody {
  // Either provide a sms_message_id (for queue processing)…
  sms_message_id?: string;
  // …or send ad-hoc:
  organization_id?: string;
  to?: string;
  message?: string;
  template_id?: string;
  tenant_id?: string;
  rent_payment_id?: string;
  trigger_type?: "manual" | "auto" | "test";
  variables?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const MONSMS_API_KEY = Deno.env.get("MONSMS_API_KEY");
    const MONSMS_COMPANY_ID = Deno.env.get("MONSMS_COMPANY_ID");
    if (!MONSMS_API_KEY || !MONSMS_COMPANY_ID) {
      throw new Error("MonSMS credentials not configured");
    }

    const body: SendBody = await req.json();

    // Resolve sms_messages row: either fetch existing or create
    let smsRow: any = null;

    if (body.sms_message_id) {
      const { data, error } = await supabase
        .from("sms_messages")
        .select("*, sms_templates(content)")
        .eq("id", body.sms_message_id)
        .single();
      if (error || !data) throw new Error(`SMS message not found: ${body.sms_message_id}`);
      smsRow = data;
    } else {
      // Ad-hoc / manual send: build payload from body
      if (!body.organization_id || !body.to || !body.message) {
        return new Response(
          JSON.stringify({ success: false, error: "organization_id, to, and message are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const phone = formatPhoneNumber(body.to);
      const insertRes = await supabase
        .from("sms_messages")
        .insert({
          organization_id: body.organization_id,
          recipient_phone: phone,
          content: body.message,
          template_id: body.template_id ?? null,
          tenant_id: body.tenant_id ?? null,
          rent_payment_id: body.rent_payment_id ?? null,
          trigger_type: body.trigger_type ?? "manual",
          status: "scheduled",
          scheduled_for: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (insertRes.error || !insertRes.data) {
        throw new Error(`Could not create sms_messages row: ${insertRes.error?.message}`);
      }
      smsRow = insertRes.data;
    }

    // Build final content (apply variables if any)
    let finalContent = smsRow.content;
    if (body.variables) {
      finalContent = renderTemplate(finalContent, body.variables);
    }

    // Resolve sender name
    const { data: org } = await supabase
      .from("organizations")
      .select("sms_sender_name")
      .eq("id", smsRow.organization_id)
      .single();
    const senderName = org?.sms_sender_name || "RentFlow";

    const phone = formatPhoneNumber(smsRow.recipient_phone);

    console.log(`[sms-send] sending id=${smsRow.id} to=${phone} sender=${senderName}`);

    const smsPayload = {
      apiKey: MONSMS_API_KEY,
      companyId: MONSMS_COMPANY_ID,
      senderId: senderName,
      contacts: [{ phone }],
      text: finalContent,
      type: "SMS",
    };

    const smsResponse = await fetch(`${MONSMS_BASE_URL}/campaign/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smsPayload),
    });

    const smsData = await smsResponse.json();
    const isSuccess = smsData?.success === true;
    const providerId = smsData?.data?.campaignId ?? smsData?.data?.id ?? null;

    console.log(`[sms-send] response id=${smsRow.id} status=${smsResponse.status} success=${isSuccess}`);

    // Update sms_messages
    await supabase
      .from("sms_messages")
      .update({
        status: isSuccess ? "sent" : "failed",
        sent_at: isSuccess ? new Date().toISOString() : null,
        error_message: isSuccess ? null : JSON.stringify(smsData?.error || smsData),
        provider_message_id: providerId,
        content: finalContent,
      })
      .eq("id", smsRow.id);

    // Log event
    await supabase.from("sms_logs").insert({
      sms_message_id: smsRow.id,
      event_type: isSuccess ? "sent" : "failed",
      details: smsData,
    });

    if (!isSuccess) {
      return new Response(
        JSON.stringify({ success: false, error: smsData?.error || smsData, sms_message_id: smsRow.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sms_message_id: smsRow.id, provider_message_id: providerId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sms-send] error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
