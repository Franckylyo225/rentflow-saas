// Edge function: appel Lovable AI pour le Pilote de croissance
// Modes: "suggestions" | "content" | "chat"
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const body = await req.json();
    const mode: string = body.mode || "chat";
    const context = body.context || {};

    // ====== Mode 1 : SUGGESTIONS (JSON via tool calling, non-stream) ======
    if (mode === "suggestions") {
      const systemPrompt = `Tu es le conseiller de croissance de Rentflow, un SaaS de gestion locative à Abidjan (Côte d'Ivoire). Objectif : 1 000 utilisateurs en 24 mois. Réponds toujours en français.`;
      const userPrompt = `Contexte:
- Utilisateurs actuels : ${context.users ?? 0}
- Tâches en retard : ${context.overdue_tasks ?? 0}
- Dernière action faite : ${context.last_done_task ?? "aucune"}
- Date du jour : ${context.today ?? new Date().toISOString().slice(0, 10)}

Génère 3 suggestions d'actions prioritaires pour aujourd'hui. Pour chacune : un titre court (max 10 mots), une explication de 2 lignes, et un type parmi : Email, Réseaux, Tech, PR, Produit.`;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_suggestions",
              description: "Retourne 3 suggestions d'actions de croissance.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        titre: { type: "string" },
                        explication: { type: "string" },
                        type: { type: "string", enum: ["Email", "Réseaux", "Tech", "PR", "Produit"] },
                      },
                      required: ["titre", "explication", "type"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_suggestions" } },
        }),
      });

      if (!resp.ok) {
        const t = await resp.text();
        const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
        return new Response(JSON.stringify({ error: t }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await resp.json();
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const parsed = args ? JSON.parse(args) : { suggestions: [] };
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ====== Mode 2 / 3 : CONTENT ou CHAT (streaming) ======
    let systemPrompt = "";
    let userPrompt = body.prompt || "";

    if (mode === "content") {
      const taskType = context.task_type || "Email";
      const taskTitle = context.task_title || "";
      const taskDesc = context.task_description || "";
      systemPrompt = `Tu es le conseiller de croissance de Rentflow, SaaS de gestion locative à Abidjan. Génère du contenu prêt à publier en français, ton chaleureux et professionnel.`;
      const typeInstructions: Record<string, string> = {
        Email: "Génère un EMAIL complet : objet (1 ligne) puis corps en HTML simple, signé Rentflow.",
        Réseaux: "Génère un POST RÉSEAUX SOCIAUX (LinkedIn/Facebook/Instagram) percutant + suggestions de visuels.",
        Tech: "Génère le PROMPT technique complet pour Lovable ou un dev (objectifs, étapes, critères d'acceptation).",
        PR: "Génère un EMAIL DE PITCH PR pour un journaliste (objet + corps).",
        Produit: "Génère les SPECS PRODUIT (problème, solution, user stories, critères d'acceptation).",
      };
      userPrompt = `Tâche : ${taskTitle}\nDescription : ${taskDesc}\nType : ${taskType}\n\n${typeInstructions[taskType] ?? typeInstructions.Email}`;
    } else {
      // chat
      systemPrompt = `Tu es le conseiller de croissance de Rentflow, SaaS de gestion locative à Abidjan. Objectif : 1 000 utilisateurs en 24 mois. Réponds en français de façon concise et actionnable. Quand tu proposes des actions, formule-les clairement avec un verbe d'action en début de phrase.

Contexte actuel :
- Utilisateurs : ${context.users ?? 0} / 1 000
- Tâches en cours : ${context.pending_tasks ?? 0}
- Rythme : ${context.pace ?? "inconnu"}`;
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...(body.history || []),
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      const status = resp.status === 429 || resp.status === 402 ? resp.status : 500;
      return new Response(JSON.stringify({ error: t }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("growth-ai error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
