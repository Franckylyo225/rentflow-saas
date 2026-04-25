import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Smartphone, Calendar as CalendarIcon, ArrowRight, BarChart3, Lock, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenants, useRentPayments } from "@/hooks/useData";
import { CalendarClock, FileSignature, Wallet, AlertTriangle } from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const PRO_FEATURE = "sms_auto_full"; // exclusif Pro & Business

interface Schedule {
  id: string;
  is_active: boolean;
  label: string;
  offset_days: number;
  send_hour: number;
  send_minute: number;
  day_of_month: number;
  send_email: boolean;
}

interface UpcomingMessage {
  id: string;
  channel: "email" | "sms";
  name: string;
  time: string;
  reason: string;
}

export function RemindersWidgets() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const { hasFeature, planName, loading: featLoading } = useFeatureAccess();
  const proAccess = hasFeature(PRO_FEATURE);

  const { data: tenants } = useTenants();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingMessage[]>([]);
  const [stats, setStats] = useState({ emailOpen: 0, smsResponse: 0, sentThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const masterActive = useMemo(
    () => schedules.length > 0 && schedules.some((s) => s.is_active),
    [schedules]
  );

  // Load schedules + upcoming + stats from DB
  useEffect(() => {
    if (!orgId || !proAccess) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);

      const [schedRes, upcomingRes, monthRes] = await Promise.all([
        supabase
          .from("sms_schedules")
          .select("id, is_active, label, offset_days, send_hour, send_minute, day_of_month, send_email")
          .eq("organization_id", orgId!)
          .order("sort_order", { ascending: true }),
        supabase
          .from("sms_messages")
          .select("id, recipient_name, scheduled_for, content, status")
          .eq("organization_id", orgId!)
          .in("status", ["scheduled", "pending"])
          .gte("scheduled_for", new Date().toISOString())
          .order("scheduled_for", { ascending: true })
          .limit(3),
        supabase
          .from("sms_messages")
          .select("id, status, sent_at", { count: "exact" })
          .eq("organization_id", orgId!)
          .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      if (cancelled) return;

      const sList = (schedRes.data || []) as Schedule[];
      setSchedules(sList);

      const list: UpcomingMessage[] = (upcomingRes.data || []).map((m: any) => {
        const d = new Date(m.scheduled_for);
        return {
          id: m.id,
          channel: "sms",
          name: m.recipient_name || "Locataire",
          time: d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
          reason: (m.content || "").slice(0, 40) || "Rappel",
        };
      });
      setUpcoming(list);

      const sent = (monthRes.data || []).filter((m: any) => m.status === "sent" || m.sent_at).length;
      const total = monthRes.count || (monthRes.data || []).length || 0;
      const rate = total > 0 ? Math.round((sent / total) * 100) : 0;
      setStats({ emailOpen: rate, smsResponse: Math.max(0, rate - 10), sentThisMonth: sent });

      setLoading(false);
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [orgId, proAccess]);

  // ===== Real upcoming events: lease ends + unpaid rent dues =====
  const { data: rentPayments } = useRentPayments();

  type EventKind = "lease_end" | "rent_due" | "rent_late";
  interface UpcomingEvent {
    id: string;
    date: Date;
    kind: EventKind;
    label: string;
    target: string;
    href: string;
    daysUntil: number;
    urgent: boolean;
  }

  const events = useMemo<UpcomingEvent[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 90); // window: next 90 days

    const out: UpcomingEvent[] = [];

    // 1) Lease ends within 90 days
    tenants.forEach((t) => {
      if (!t.lease_start || !t.lease_duration) return;
      const end = new Date(t.lease_start);
      end.setMonth(end.getMonth() + t.lease_duration);
      if (end < today || end > horizon) return;
      const daysUntil = Math.ceil((end.getTime() - today.getTime()) / 86400000);
      out.push({
        id: `lease-${t.id}`,
        date: end,
        kind: "lease_end",
        label: daysUntil <= 30 ? "Fin de bail" : "Renouvellement à prévoir",
        target: `${t.full_name} — ${t.units?.properties?.name || t.units?.name || "Bien"}`,
        href: `/tenants/${t.id}`,
        daysUntil,
        urgent: daysUntil <= 30,
      });
    });

    // 2) Rent dues in next 30 days that aren't fully paid
    rentPayments.forEach((rp) => {
      if (!rp.due_date) return;
      const due = new Date(rp.due_date);
      due.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86400000);

      // Skip fully paid
      if (rp.status === "paid") return;
      // Only show upcoming (next 14d) or recently late (last 30d)
      if (daysUntil > 14 || daysUntil < -30) return;

      const tenantName = rp.tenants?.full_name || "Locataire";
      const unitName = rp.tenants?.units?.properties?.name || rp.tenants?.units?.name || "";
      const isLate = daysUntil < 0 || rp.status === "late";

      out.push({
        id: `rent-${rp.id}`,
        date: due,
        kind: isLate ? "rent_late" : "rent_due",
        label: isLate
          ? `Loyer en retard (${Math.abs(daysUntil)}j)`
          : daysUntil === 0
            ? "Loyer dû aujourd'hui"
            : `Loyer à venir (J-${daysUntil})`,
        target: `${tenantName}${unitName ? ` — ${unitName}` : ""}`,
        href: rp.tenants?.id ? `/tenants/${rp.tenants.id}` : "/rents",
        daysUntil,
        urgent: isLate || daysUntil <= 3,
      });
    });

    return out
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [tenants, rentPayments]);

  function fmtEventDate(d: Date) {
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }

  function eventIcon(kind: EventKind) {
    if (kind === "lease_end") return <FileSignature className="h-3.5 w-3.5 text-info flex-shrink-0" />;
    if (kind === "rent_late") return <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />;
    return <Wallet className="h-3.5 w-3.5 text-success flex-shrink-0" />;
  }

  async function setAllSchedules(active: boolean) {
    if (!orgId || schedules.length === 0) return;
    setBusy(true);
    const { error } = await supabase
      .from("sms_schedules")
      .update({ is_active: active })
      .eq("organization_id", orgId);
    setBusy(false);
    if (error) {
      toast.error("Impossible de mettre à jour les relances");
      return;
    }
    setSchedules((prev) => prev.map((s) => ({ ...s, is_active: active })));
    toast[active ? "success" : "warning"](
      active ? "Relances automatiques activées" : "Relances automatiques désactivées"
    );
  }

  function handleToggle(next: boolean) {
    if (!next) setConfirmOpen(true);
    else setAllSchedules(true);
  }

  function confirmDeactivation() {
    setConfirmOpen(false);
    setAllSchedules(false);
  }

  // ============ LOCKED VIEW (non-Pro) ============
  if (!featLoading && !proAccess) {
    return (
      <div className="space-y-4">
        <Card className="border-border bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Lock className="h-3.5 w-3.5 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Relances automatiques</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary bg-primary/5">
              <Sparkles className="h-2.5 w-2.5" /> Réservé au plan Pro
            </Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Activez les rappels SMS et email automatiques pour réduire les retards de paiement et gagner du temps chaque mois.
            </p>
            <ul className="space-y-1 text-[11px] text-muted-foreground">
              <li className="flex items-center gap-1.5"><span className="text-success">✓</span> Séquences personnalisables</li>
              <li className="flex items-center gap-1.5"><span className="text-success">✓</span> SMS + Email</li>
              <li className="flex items-center gap-1.5"><span className="text-success">✓</span> Statistiques d'ouverture</li>
            </ul>
            <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={() => navigate("/pricing")}>
              Passer à Pro <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> Prochaines échéances
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-1.5">
              {events.map((e, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-base">📅</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-card-foreground"><span className="text-muted-foreground">{e.date}</span> — {e.label}</p>
                    <p className="text-muted-foreground truncate">{e.target}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1 mt-2" onClick={() => navigate("/notifications")}>
              Voir calendrier <ArrowRight className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============ ACTIVE VIEW (Pro+) ============
  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Relances automatiques
            </CardTitle>
            <Switch checked={masterActive} onCheckedChange={handleToggle} disabled={busy || loading || schedules.length === 0} />
          </div>
          <p className="text-xs text-muted-foreground">
            État : <span className={masterActive ? "text-success font-semibold" : "text-muted-foreground"}>
              {masterActive ? `Actives (${schedules.filter(s => s.is_active).length}/${schedules.length})` : "Désactivées"}
            </span>
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : masterActive ? (
            <>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Prochaines relances</p>
              <ul className="space-y-1.5">
                {upcoming.length > 0 ? (
                  upcoming.map((r) => (
                    <li key={r.id} className="flex items-start gap-2 text-xs">
                      <Smartphone className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-card-foreground truncate">{r.name}</p>
                        <p className="text-muted-foreground truncate">{r.time} · {r.reason}</p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-muted-foreground italic">
                    Aucune relance programmée. Les rappels seront générés automatiquement à l'approche des échéances.
                  </li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucune relance ne sera envoyée.</p>
          )}
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1 mt-2" onClick={() => navigate("/settings?tab=sms")}>
            Gérer les séquences <ArrowRight className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" /> Prochaines échéances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="space-y-1.5">
            {events.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className="text-base">📅</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-card-foreground"><span className="text-muted-foreground">{e.date}</span> — {e.label}</p>
                  <p className="text-muted-foreground truncate">{e.target}</p>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1 mt-2" onClick={() => navigate("/notifications")}>
            Voir calendrier <ArrowRight className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Statistiques relances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Taux d'envoi SMS</span>
              <span className="font-bold text-card-foreground">{stats.emailOpen}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-info transition-all duration-500" style={{ width: `${stats.emailOpen}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">SMS envoyés ce mois</span>
              <span className="font-bold text-card-foreground">{stats.sentThisMonth}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${Math.min(100, stats.sentThisMonth * 10)}%` }} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic">Plan : {planName}</p>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver les relances ?</AlertDialogTitle>
            <AlertDialogDescription>
              {schedules.filter(s => s.is_active).length} séquence(s) active(s) seront mises en pause.
              Aucun rappel automatique ne sera envoyé tant que vous ne réactiverez pas le système. Confirmer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivation}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
