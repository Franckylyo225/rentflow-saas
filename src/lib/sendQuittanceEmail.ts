import { supabase } from "@/integrations/supabase/client";

export interface SendQuittanceEmailPayload {
  recipientEmail: string;
  tenantName: string;
  month: string;
  amount: number;
  organizationName?: string;
  pdfBase64: string;
  pdfFilename: string;
  organizationId?: string;
  rentPaymentId?: string;
}

export interface SendQuittanceEmailResult {
  ok: boolean;
  /** Message lisible par l'utilisateur (toujours fourni) */
  message: string;
  /** Code d'erreur machine (invalid_email, rate_limited, etc.) */
  code?: string;
}

/**
 * Appelle l'edge function `send-quittance-email` et renvoie un résultat
 * structuré incluant un message d'erreur lisible côté utilisateur.
 *
 * Utilise `fetch` directement (au lieu de `supabase.functions.invoke`) car
 * ce dernier masque le corps de la réponse en cas d'erreur HTTP.
 */
export async function sendQuittanceEmail(
  payload: SendQuittanceEmailPayload
): Promise<SendQuittanceEmailResult> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/send-quittance-email`;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken =
      sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    });

    let body: any = null;
    try {
      body = await response.json();
    } catch {
      // ignore JSON parse errors
    }

    if (response.ok) {
      return { ok: true, message: `Quittance envoyée à ${payload.recipientEmail}` };
    }

    const message =
      body?.error ||
      `Échec de l'envoi (code ${response.status}). Réessayez dans quelques minutes.`;
    return { ok: false, message, code: body?.code };
  } catch (err) {
    const message =
      err instanceof Error
        ? `Connexion impossible au service d'envoi : ${err.message}`
        : "Connexion impossible au service d'envoi.";
    return { ok: false, message, code: "network_error" };
  }
}
