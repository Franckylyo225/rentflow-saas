// Génère les échéances de loyer du mois courant pour tous les locataires actifs.
// - Idempotent : ignore les échéances déjà existantes (tenant_id + month).
// - Lease futur : ignoré tant que lease_start n'a pas atteint le mois en cours.
// - Déclenché par cron (1er du mois) ou appel manuel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Mois cible : par défaut le mois courant. Permet override via body { month: "YYYY-MM" }.
    let targetMonth: string | null = null;
    try {
      const body = await req.json();
      if (body?.month && /^\d{4}-\d{2}$/.test(body.month)) targetMonth = body.month;
    } catch { /* no body */ }

    const now = new Date();
    if (!targetMonth) {
      targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    const [yearStr, monthStr] = targetMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr); // 1-12

    // Récupère tous les locataires actifs avec leur unité, propriété, organisation
    const { data: tenants, error: tenantsErr } = await supabase
      .from("tenants")
      .select("id, full_name, rent, lease_start, is_active, units!inner(rent, properties!inner(organization_id, organizations!inner(rent_due_day)))")
      .eq("is_active", true);

    if (tenantsErr) throw tenantsErr;
    if (!tenants?.length) {
      return new Response(JSON.stringify({ ok: true, month: targetMonth, created: 0, skipped: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filtre : lease_start doit être <= dernier jour du mois cible
    const monthEnd = new Date(year, month, 0); // dernier jour du mois
    const eligibleTenants = tenants.filter((t: any) => {
      if (!t.lease_start) return false;
      return new Date(t.lease_start) <= monthEnd;
    });

    // Récupère les paiements déjà existants pour ce mois
    const tenantIds = eligibleTenants.map((t: any) => t.id);
    const { data: existing, error: existingErr } = await supabase
      .from("rent_payments")
      .select("tenant_id")
      .eq("month", targetMonth)
      .in("tenant_id", tenantIds);
    if (existingErr) throw existingErr;
    const existingSet = new Set((existing || []).map((p: any) => p.tenant_id));

    // Construit les nouvelles lignes
    const rows = eligibleTenants
      .filter((t: any) => !existingSet.has(t.id))
      .map((t: any) => {
        const dueDay = Math.min(Math.max(t.units?.properties?.organizations?.rent_due_day || 5, 1), 28);
        const dueDate = `${yearStr}-${monthStr}-${String(dueDay).padStart(2, "0")}`;
        const amount = t.rent || t.units?.rent || 0;
        return {
          tenant_id: t.id,
          amount,
          paid_amount: 0,
          due_date: dueDate,
          month: targetMonth,
          status: "pending" as const,
        };
      })
      .filter((r) => r.amount > 0);

    let created = 0;
    if (rows.length > 0) {
      const { error: insertErr } = await supabase.from("rent_payments").insert(rows);
      if (insertErr) throw insertErr;
      created = rows.length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        month: targetMonth,
        eligible: eligibleTenants.length,
        already_existing: existingSet.size,
        created,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-monthly-rents error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
