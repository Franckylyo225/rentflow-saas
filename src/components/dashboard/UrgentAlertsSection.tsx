import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Clock, MailWarning, X, CheckCircle2, BellRing, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTenants, useRentPayments } from "@/hooks/useData";

type AlertItem = {
  id: string;
  type: "unpaid" | "lease_expiring" | "no_payment";
  title: string;
  detail: string;
  actionLabel: string;
  toastMessage: string;
  icon: typeof AlertCircle;
  iconClass: string;
};

const STORAGE_KEY = "dashboard.urgent_alerts.dismissed";

function loadDismissed(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveDismissed(ids: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {}
}

export function UrgentAlertsSection({ selectedMonth }: { selectedMonth: string }) {
  const { data: tenants } = useTenants();
  const { data: payments } = useRentPayments();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => { setDismissed(loadDismissed()); }, []);

  const alerts = useMemo<AlertItem[]>(() => {
    const out: AlertItem[] = [];
    const today = new Date();

    // 🔴 Loyer impayé > 7j
    payments
      .filter(p => p.status !== "paid" && p.amount > p.paid_amount)
      .forEach(p => {
        const due = new Date(p.due_date);
        const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        if (days > 7) {
          const propertyName = p.tenants?.units?.properties?.name || p.tenants?.units?.name || "—";
          const remaining = p.amount - p.paid_amount;
          out.push({
            id: `unpaid-${p.id}`,
            type: "unpaid",
            title: p.tenants?.full_name || "Locataire",
            detail: `${propertyName} — ${remaining.toLocaleString()} FCFA — échu depuis ${days} jours`,
            actionLabel: "Envoyer relance SMS",
            toastMessage: `Relance SMS envoyée à ${p.tenants?.full_name || "le locataire"}`,
            icon: AlertCircle,
            iconClass: "text-destructive",
          });
        }
      });

    // 🟠 Bails expirant < 30j
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
          title: t.full_name,
          detail: `${propertyName} — expire le ${end.toLocaleDateString("fr-FR")}`,
          actionLabel: "Envoyer renouvellement",
          toastMessage: `Proposition de renouvellement envoyée à ${t.full_name}`,
          icon: Clock,
          iconClass: "text-warning",
        });
      }
    });

    // 🔵 Locataire sans paiement enregistré ce mois
    tenants.forEach(t => {
      const hasPayment = payments.some(p => p.tenant_id === t.id && p.month === selectedMonth);
      if (!hasPayment) {
        const propertyName = t.units?.properties?.name || t.units?.name || "—";
        out.push({
          id: `nopay-${t.id}-${selectedMonth}`,
          type: "no_payment",
          title: t.full_name,
          detail: `${propertyName} — aucun paiement enregistré`,
          actionLabel: "Envoyer rappel email",
          toastMessage: `Rappel email envoyé à ${t.full_name}`,
          icon: MailWarning,
          iconClass: "text-info",
        });
      }
    });

    return out
      .filter(a => !dismissed.includes(a.id))
      .slice(0, 5);
  }, [tenants, payments, selectedMonth, dismissed]);

  function handleDismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    saveDismissed(next);
  }

  function handleAction(a: AlertItem) {
    toast.success(a.toastMessage);
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
    <div className="rounded-xl border-l-4 border-l-warning border border-warning/20 bg-[hsl(33_100%_96%)] dark:bg-warning/10 p-4 space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-bold text-foreground">⚡ À traiter aujourd'hui</h3>
        <span className="text-xs text-muted-foreground">({alerts.length})</span>
      </div>
      <div className="space-y-2">
        {alerts.map(a => {
          const Icon = a.icon;
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
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 flex-shrink-0" onClick={() => handleAction(a)}>
                {a.type === "unpaid" ? <Send className="h-3 w-3" /> : a.type === "lease_expiring" ? <FileText className="h-3 w-3" /> : <MailWarning className="h-3 w-3" />}
                {a.actionLabel}
              </Button>
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
  );
}
