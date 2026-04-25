import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, MailWarning, X, CheckCircle2, BellRing, FileText, Send, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTenants, useRentPayments } from "@/hooks/useData";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useProfile } from "@/hooks/useProfile";
import { useOrgSettings } from "@/contexts/OrgSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AlertChannel = "sms" | "email";

type AlertItem = {
  id: string;
  type: "unpaid" | "lease_expiring" | "no_payment";
  channel: AlertChannel;
  title: string;
  detail: string;
  actionLabel: string;
  icon: typeof AlertCircle;
  iconClass: string;
  // Payload to perform the actual send
  tenantId: string;
  tenantName: string;
  tenantPhone?: string | null;
  tenantEmail?: string | null;
  rentPaymentId?: string;
  amount?: number;
  dueDate?: string;
  leaseEnd?: string;
};

const STORAGE_KEY = "dashboard.urgent_alerts.dismissed";

function loadDismissed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveDismissed(ids: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
}

function fmtAmount(n: number) {
  return Number(n || 0).toLocaleString("fr-FR");
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("fr-FR");
}

export function UrgentAlertsSection({ selectedMonth }: { selectedMonth: string }) {
  const { data: tenants } = useTenants();
  const { data: payments } = useRentPayments();
  const { hasFeature } = useFeatureAccess();
  const { profile } = useProfile();
  const { settings } = useOrgSettings();
  const orgName = settings?.sms_sender_name || settings?.name || "RentFlow";

  const canSms = hasFeature("sms_reminders");
  const canEmail = hasFeature("email_reminders");

  const [dismissed, setDismissed] = useState<string[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => { setDismissed(loadDismissed()); }, []);

  const alerts = useMemo<AlertItem[]>(() => {
    const out: AlertItem[] = [];
    const today = new Date();

    // 🔴 Loyer impayé > 7j → SMS si dispo, sinon Email
    payments
      .filter(p => p.status !== "paid" && (p.amount || 0) > (p.paid_amount || 0))
      .forEach(p => {
        const due = new Date(p.due_date);
        const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        if (days > 7) {
          const propertyName = p.tenants?.units?.properties?.name || p.tenants?.units?.name || "—";
          const remaining = (p.amount || 0) - (p.paid_amount || 0);
          const tenant = p.tenants;
          if (!tenant) return;
          const channel: AlertChannel = canSms && tenant.phone ? "sms" : "email";
          out.push({
            id: `unpaid-${p.id}`,
            type: "unpaid",
            channel,
            title: tenant.full_name || "Locataire",
            detail: `${propertyName} — ${fmtAmount(remaining)} FCFA — échu depuis ${days} jours`,
            actionLabel: channel === "sms" ? "Envoyer relance SMS" : "Envoyer relance email",
            icon: AlertCircle,
            iconClass: "text-destructive",
            tenantId: tenant.id,
            tenantName: tenant.full_name,
            tenantPhone: tenant.phone,
            tenantEmail: (tenant as any).email,
            rentPaymentId: p.id,
            amount: p.amount,
            dueDate: p.due_date,
          });
        }
      });

    // 🟠 Bails expirant < 30j → Email
    tenants.forEach(t => {
      if (!t.lease_start || !t.lease_duration) return;
      const start = new Date(t.lease_start);
      const end = new Date(start);
      end.setMonth(end.getMonth() + t.lease_duration);
      const daysLeft = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft >= 0 && daysLeft < 30) {
        const propertyName = t.units?.properties?.name || t.units?.name || "—";
        out.push({
          id: `lease-${t.id}`,
          type: "lease_expiring",
          channel: "email",
          title: t.full_name,
          detail: `${propertyName} — expire le ${fmtDate(end)}`,
          actionLabel: "Envoyer renouvellement",
          icon: Clock,
          iconClass: "text-warning",
          tenantId: t.id,
          tenantName: t.full_name,
          tenantPhone: t.phone,
          tenantEmail: (t as any).email,
          leaseEnd: end.toISOString(),
        });
      }
    });

    // 🔵 Locataire sans paiement enregistré ce mois → Email rappel
    tenants.forEach(t => {
      const hasPayment = payments.some(p => p.tenant_id === t.id && p.month === selectedMonth);
      if (!hasPayment) {
        const propertyName = t.units?.properties?.name || t.units?.name || "—";
        out.push({
          id: `nopay-${t.id}-${selectedMonth}`,
          type: "no_payment",
          channel: "email",
          title: t.full_name,
          detail: `${propertyName} — aucun paiement enregistré`,
          actionLabel: "Envoyer rappel email",
          icon: MailWarning,
          iconClass: "text-info",
          tenantId: t.id,
          tenantName: t.full_name,
          tenantPhone: t.phone,
          tenantEmail: (t as any).email,
        });
      }
    });

    return out
      .filter(a => !dismissed.includes(a.id))
      .slice(0, 5);
  }, [tenants, payments, selectedMonth, dismissed, canSms]);

  function handleDismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    saveDismissed(next);
  }

  async function fetchEmailTemplate(templateKey: string) {
    if (!profile?.organization_id) return null;
    const { data } = await supabase
      .from("email_templates")
      .select("subject, html_content")
      .eq("organization_id", profile.organization_id)
      .eq("template_key", templateKey)
      .maybeSingle();
    return data;
  }

  function renderTpl(s: string, vars: Record<string, string>) {
    let out = s;
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), v ?? "");
    }
    return out;
  }

  async function sendUnpaidSms(a: AlertItem) {
    if (!a.tenantPhone) throw new Error("Numéro de téléphone manquant");
    const message = `Bonjour ${a.tenantName}, votre loyer de ${fmtAmount(a.amount || 0)} FCFA était dû le ${fmtDate(new Date(a.dueDate || Date.now()))}. Merci de régulariser. ${orgName}`;
    const { data, error } = await supabase.functions.invoke("sms-send", {
      body: {
        recipient_phone: a.tenantPhone,
        recipient_name: a.tenantName,
        content: message,
        tenant_id: a.tenantId,
        rent_payment_id: a.rentPaymentId,
        trigger_type: "manual",
      },
    });
    if (error) throw error;
    if (data && (data as any).success === false) {
      throw new Error((data as any).error || "Échec d'envoi SMS");
    }
  }

  async function sendEmail(a: AlertItem) {
    if (!a.tenantEmail) throw new Error("Email du locataire manquant");
    let subject = "";
    let html = "";
    const variables: Record<string, string> = {
      tenant_name: a.tenantName,
      rent_amount: fmtAmount(a.amount || 0),
      due_date: a.dueDate ? fmtDate(new Date(a.dueDate)) : "",
      agency_name: orgName,
      lease_end: a.leaseEnd ? fmtDate(new Date(a.leaseEnd)) : "",
    };

    if (a.type === "unpaid") {
      const tpl = await fetchEmailTemplate("reminder_after");
      subject = renderTpl(tpl?.subject || "Loyer en retard - Action requise", variables);
      html = renderTpl(tpl?.html_content || `<p>Bonjour ${a.tenantName},</p><p>Votre loyer de ${fmtAmount(a.amount || 0)} FCFA, échu le ${variables.due_date}, n'est toujours pas réglé.</p><p>Merci de procéder au règlement dans les plus brefs délais.</p><p>Cordialement,<br/>${orgName}</p>`, variables);
    } else if (a.type === "no_payment") {
      const tpl = await fetchEmailTemplate("reminder_before");
      subject = renderTpl(tpl?.subject || `Rappel de loyer - ${orgName}`, variables);
      html = renderTpl(tpl?.html_content || `<p>Bonjour ${a.tenantName},</p><p>Nous n'avons pas encore enregistré votre paiement de loyer pour ce mois. Merci de procéder au règlement.</p><p>Cordialement,<br/>${orgName}</p>`, variables);
    } else {
      // lease_expiring → template inline
      subject = `Renouvellement de votre bail - ${orgName}`;
      html = `<p>Bonjour ${a.tenantName},</p><p>Votre bail arrive à échéance le <strong>${variables.lease_end}</strong>.</p><p>Souhaitez-vous le renouveler ? Merci de nous contacter pour en discuter les modalités.</p><p>Cordialement,<br/>${orgName}</p>`;
    }

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        templateName: "__inline__",
        recipientEmail: a.tenantEmail,
        inlineSubject: subject,
        inlineHtml: html,
        templateData: variables,
        organizationId: profile?.organization_id,
      },
    });
    if (error) throw error;
    if (data && (data as any).error) throw new Error((data as any).error);

    // Log to email_reminder_logs if linked to a rent_payment
    if (a.rentPaymentId && profile?.organization_id) {
      await supabase.from("email_reminder_logs").insert({
        organization_id: profile.organization_id,
        recipient_email: a.tenantEmail,
        rent_payment_id: a.rentPaymentId,
        template_key: a.type === "unpaid" ? "reminder_after_manual" : "reminder_before_manual",
        status: "sent",
        audit_context: {
          source: "dashboard_urgent_alerts",
          alert_type: a.type,
          tenant_id: a.tenantId,
          triggered_at: new Date().toISOString(),
        },
      });
    }
  }

  async function handleAction(a: AlertItem) {
    // Plan / channel guards
    if (a.channel === "sms" && !canSms) {
      toast.error("Les SMS ne sont pas inclus dans votre offre actuelle");
      return;
    }
    if (a.channel === "email" && !canEmail) {
      toast.error("Les rappels par email ne sont pas inclus dans votre offre actuelle");
      return;
    }
    if (a.channel === "sms" && !a.tenantPhone) {
      toast.error("Numéro de téléphone manquant pour ce locataire");
      return;
    }
    if (a.channel === "email" && !a.tenantEmail) {
      toast.error("Adresse email manquante pour ce locataire");
      return;
    }

    setSendingId(a.id);
    try {
      if (a.channel === "sms") {
        await sendUnpaidSms(a);
        toast.success(`SMS envoyé à ${a.tenantName}`);
      } else {
        await sendEmail(a);
        toast.success(`Email envoyé à ${a.tenantName}`);
      }
      // Auto-dismiss after success
      handleDismiss(a.id);
    } catch (e) {
      toast.error(`Échec de l'envoi : ${e instanceof Error ? e.message : "erreur inconnue"}`);
    } finally {
      setSendingId(null);
    }
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
        <p className="text-sm font-medium text-foreground">✅ Tout est en ordre — aucune action urgente</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-xl border-l-4 border-l-warning border border-warning/20 bg-[hsl(33_100%_96%)] dark:bg-warning/10 p-4 space-y-3 animate-fade-in">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-bold text-foreground">⚡ À traiter aujourd'hui</h3>
          <span className="text-xs text-muted-foreground">({alerts.length})</span>
        </div>
        <div className="space-y-2">
          {alerts.map(a => {
            const Icon = a.icon;
            const isSending = sendingId === a.id;
            const channelDisabled =
              (a.channel === "sms" && !canSms) ||
              (a.channel === "email" && !canEmail);
            const missingContact =
              (a.channel === "sms" && !a.tenantPhone) ||
              (a.channel === "email" && !a.tenantEmail);
            const disabled = isSending || channelDisabled || missingContact;
            const ChannelIcon = a.type === "unpaid" && a.channel === "sms"
              ? Send
              : a.type === "lease_expiring"
              ? FileText
              : MailWarning;

            const tooltip = channelDisabled
              ? `Action ${a.channel === "sms" ? "SMS" : "Email"} non incluse dans votre offre`
              : missingContact
              ? `${a.channel === "sms" ? "Téléphone" : "Email"} du locataire manquant`
              : a.channel === "sms"
              ? "Envoi SMS via MonSMS Pro"
              : "Envoi email via Resend";

            return (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5 hover:shadow-sm transition-shadow"
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", a.iconClass)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-card-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.detail}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 flex-shrink-0"
                        onClick={() => handleAction(a)}
                        disabled={disabled}
                      >
                        {isSending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : channelDisabled ? (
                          <Lock className="h-3 w-3" />
                        ) : (
                          <ChannelIcon className="h-3 w-3" />
                        )}
                        {a.actionLabel}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{tooltip}</TooltipContent>
                </Tooltip>
                <button
                  type="button"
                  onClick={() => handleDismiss(a.id)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Masquer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
