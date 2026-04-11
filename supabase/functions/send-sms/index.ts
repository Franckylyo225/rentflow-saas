import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MONSMS_BASE_URL = "https://rest.monsms.pro/v1";

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.()]/g, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.substring(1);
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const MONSMS_API_KEY = Deno.env.get("MONSMS_API_KEY");
    if (!MONSMS_API_KEY) throw new Error("MONSMS_API_KEY is not configured");
    const MONSMS_COMPANY_ID = Deno.env.get("MONSMS_COMPANY_ID");
    if (!MONSMS_COMPANY_ID) throw new Error("MONSMS_COMPANY_ID is not configured");

    const { to, message, senderName, organizationId, recipientName, templateKey } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs 'to' et 'message' requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve sender name from organization settings if not provided
    let resolvedSenderName = senderName;
    if (!resolvedSenderName && organizationId) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("sms_sender_name")
        .eq("id", organizationId)
        .single();
      resolvedSenderName = org?.sms_sender_name || "RentFlow";
    }
    if (!resolvedSenderName) resolvedSenderName = "RentFlow";

    const recipientPhone = formatPhoneNumber(to);

    console.log(`Sending SMS via MonSMS Pro: to=${recipientPhone}, sender=${resolvedSenderName}`);

    const smsPayload = {
      apiKey: MONSMS_API_KEY,
      companyId: MONSMS_COMPANY_ID,
      senderId: resolvedSenderName,
      contacts: [{ phone: recipientPhone }],
      text: message,
      type: "SMS",
    };

    const smsResponse = await fetch(`${MONSMS_BASE_URL}/campaign/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smsPayload),
    });

    const smsData = await smsResponse.json();
    console.log(`MonSMS Pro response [${smsResponse.status}]: ${JSON.stringify(smsData)}`);

    const isSuccess = smsData?.success === true;

    // Log to sms_history
    if (organizationId) {
      await supabaseAdmin.from("sms_history").insert({
        organization_id: organizationId,
        recipient_phone: recipientPhone,
        recipient_name: recipientName || "",
        message: message,
        sender_name: senderName || "",
        status: isSuccess ? "sent" : "failed",
        error_message: isSuccess ? null : JSON.stringify(smsData?.error || smsData),
        orange_message_id: null,
        template_key: templateKey || null,
      });
    }

    if (!isSuccess) {
      throw new Error(`MonSMS Pro error: ${JSON.stringify(smsData?.error || smsData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: smsData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending SMS:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
