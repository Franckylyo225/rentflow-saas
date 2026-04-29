// Edge function: génère le plan d'actions de la semaine via IA, lundi 7h.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Contexte
    const [{ count: usersCount }, { data: lastMetrics }, { data: settings }] = await Promise.all([
      supabase.from("organizations").select("*", { count: "exact", head: true }),
      supabase.from("growth_metrics").select("*").order("date", { ascending: false }).limit(2),
      supabase.from("growth_settings").select("*"),
    ]);

    const settingsMap = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]));
    const target = parseInt(settingsMap.target_users ?? "1000");

    // Lundi de la semaine courante (UTC)
    const now = new Date();
    const day = now.getUTCDay(); // 0=dim..6=sam
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diffToMonday);
    monday.setUTCHours(0, 0, 0, 0);

    const systemPrompt = `Tu es le conseiller de croissance de Rentflow, SaaS de gestion locative à Abidjan. Objectif : ${target} utilisateurs en 24 mois. Réponds en français.`;
    const userPrompt = `Génère le plan d'actions de la semaine pour Rentflow.
Contexte :
- Utilisateurs actuels : ${usersCount ?? 0}
- Métriques récentes : ${JSON.stringify(lastMetrics ?? [])}
Génère 5 à 7 tâches réparties sur la semaine du lundi (day_offset=0) au vendredi (day_offset=4).
Types possibles : Email, Réseaux, Tech, PR, Produit. Priorités : Urgent, Normal, Faible.
Heure au format HH:MM.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_tasks",
            description: "Retourne le plan de tâches de la semaine.",
            parameters: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      type: { type: "string", enum: ["Email", "Réseaux", "Tech", "PR", "Produit"] },
                      priority: { type: "string", enum: ["Urgent", "Normal", "Faible"] },
                      day_offset: { type: "integer", minimum: 0, maximum: 4 },
                      due_time: { type: "string" },
                    },
                    required: ["title", "description", "type", "priority", "day_offset", "due_time"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["tasks"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_tasks" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error:", resp.status, t);
      return new Response(JSON.stringify({ error: t }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { tasks: [] };

    const rows = (parsed.tasks ?? []).map((t: any) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + t.day_offset);
      return {
        title: t.title,
        description: t.description,
        type: t.type,
        priority: t.priority,
        due_date: d.toISOString().slice(0, 10),
        due_time: t.due_time,
        recurring: true,
        recurrence_rule: "weekly_auto",
      };
    });

    if (rows.length > 0) {
      await supabase.from("growth_tasks").insert(rows);
    }

    return new Response(JSON.stringify({ inserted: rows.length, tasks: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-weekly-tasks error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
