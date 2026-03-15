import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Orange Developer endpoints
const ORANGE_TOKEN_URL = "https://api.orange.com/oauth/v3/token";
const ORANGE_SMS_URL = "https://api.orange.com/smsmessaging/v1/outbound";

// Country sender numbers per Orange Developer docs
// The senderAddress must use these, NOT the recipient's number
const COUNTRY_SENDER_NUMBERS: Record<string, string> = {
  "225": "2250000", // Côte d'Ivoire
  "237": "2370000", // Cameroon
  "226": "2260000", // Burkina Faso
  "224": "2240000", // Guinea Conakry
  "245": "2450000", // Guinea Bissau
  "243": "2430000", // DR Congo
  "231": "2310000", // Liberia
  "223": "2230000", // Mali
  "261": "2610000", // Madagascar
  "221": "2210000", // Senegal
  "216": "2160000", // Tunisia
  "267": "2670000", // Botswana
  "962": "9620000", // Jordan
};

async function getOrangeAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);

  console.log("Requesting OAuth token from:", ORANGE_TOKEN_URL);
  const response = await fetch(ORANGE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Orange OAuth failed [${response.status}]: ${errorBody}`);
  }

  const data = await response.json();
  console.log("OAuth token obtained successfully");
  return data.access_token;
}

function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, dots, parentheses
  let cleaned = phone.replace(/[\s\-\.()]/g, "");
  // Ensure starts with +
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

function getSenderNumberFromRecipient(recipientPhone: string): string {
  // recipientPhone is like "+2250758160904"
  // Extract country code by matching against known prefixes
  const withoutPlus = recipientPhone.replace("+", "");

  for (const [prefix, senderNum] of Object.entries(COUNTRY_SENDER_NUMBERS)) {
    if (withoutPlus.startsWith(prefix)) {
      return senderNum;
    }
  }

  // Fallback: use first 3 digits + "0000"
  const fallback = withoutPlus.substring(0, 3) + "0000";
  console.log(`No known country sender for prefix, using fallback: ${fallback}`);
  return fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ORANGE_CLIENT_ID = Deno.env.get("ORANGE_CLIENT_ID");
    if (!ORANGE_CLIENT_ID) throw new Error("ORANGE_CLIENT_ID is not configured");

    const ORANGE_CLIENT_SECRET = Deno.env.get("ORANGE_CLIENT_SECRET");
    if (!ORANGE_CLIENT_SECRET) throw new Error("ORANGE_CLIENT_SECRET is not configured");

    const { to, message, senderName } = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs 'to' et 'message' requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recipientPhone = formatPhoneNumber(to);
    const recipientAddress = `tel:${recipientPhone}`;

    // Per Orange docs: senderAddress must be the country_sender_number, NOT the recipient
    const countrySenderNumber = getSenderNumberFromRecipient(recipientPhone);
    const senderAddress = `tel:+${countrySenderNumber}`;

    console.log(`Sending SMS: senderAddress=${senderAddress} to=${recipientAddress}`);

    // Get OAuth2 token
    const accessToken = await getOrangeAccessToken(ORANGE_CLIENT_ID, ORANGE_CLIENT_SECRET);

    // Build URL: tel:+ must be URL-encoded as tel%3A%2B
    const encodedSender = `tel%3A%2B${countrySenderNumber}`;
    const smsUrl = `${ORANGE_SMS_URL}/${encodedSender}/requests`;

    const smsPayload = {
      outboundSMSMessageRequest: {
        address: recipientAddress,
        senderAddress: senderAddress,
        ...(senderName ? { senderName } : {}),
        outboundSMSTextMessage: {
          message: message,
        },
      },
    };

    console.log(`SMS API URL: ${smsUrl}`);
    console.log(`SMS Payload: ${JSON.stringify(smsPayload)}`);

    const smsResponse = await fetch(smsUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(smsPayload),
    });

    const smsData = await smsResponse.json();
    console.log(`SMS API response [${smsResponse.status}]: ${JSON.stringify(smsData)}`);

    if (!smsResponse.ok) {
      throw new Error(`Orange SMS API error [${smsResponse.status}]: ${JSON.stringify(smsData)}`);
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
