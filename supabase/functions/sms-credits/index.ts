import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MONSMS_BASE_URL = "https://rest.monsms.pro/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MONSMS_API_KEY = Deno.env.get("MONSMS_API_KEY");
    if (!MONSMS_API_KEY) throw new Error("MONSMS_API_KEY is not configured");
    const MONSMS_COMPANY_ID = Deno.env.get("MONSMS_COMPANY_ID");
    if (!MONSMS_COMPANY_ID) throw new Error("MONSMS_COMPANY_ID is not configured");

    // Try to get company credit balance
    const creditRes = await fetch(`${MONSMS_BASE_URL}/company/credit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: MONSMS_API_KEY,
        companyId: MONSMS_COMPANY_ID,
      }),
    });

    const creditData = await creditRes.json();
    console.log(`MonSMS credit response: ${JSON.stringify(creditData)}`);

    // Try transaction stats too
    const statsRes = await fetch(`${MONSMS_BASE_URL}/transaction/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: MONSMS_API_KEY,
        companyId: MONSMS_COMPANY_ID,
      }),
    });

    const statsData = await statsRes.json();
    console.log(`MonSMS stats response: ${JSON.stringify(statsData)}`);

    return new Response(
      JSON.stringify({ success: true, credit: creditData, stats: statsData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching SMS credits:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
