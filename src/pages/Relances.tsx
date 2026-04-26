import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, ArrowUp, ArrowDown, ArrowUpDown, Mail, MessageSquare, Smartphone,
  AlertTriangle, CheckCircle2, Clock, Send, Lock, Sparkles, FlaskConical,
} from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TestSendDialog } from "@/components/relances/TestSendDialog";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { format, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

// ----------------- Types & mock data -----------------

type Channel = "email" | "sms";
type ReminderStatus = "Impayé" | "En retard" | "Relancé";

interface UrgentReminder {
  id: string;
  tenant: string;
  property: string;
  amount: number;
  daysLate: number;
  lastReminderAt: string | null; // human label like "Il y a 4j"
  lastReminderChannel: Channel | "auto" | null;
  status: ReminderStatus;
  autoReminded: boolean;
}

const initialReminders: UrgentReminder[] = [
  { id: "r1", tenant: "Kouassi Amani", property: "Villa Angré F5", amount: 450000, daysLate: 12, lastReminderAt: "Il y a 4j", lastReminderChannel: "email", status: "Impayé", autoReminded: false },
  { id: "r2", tenant: "Traoré Mariam", property: "Appt Riviera 2", amount: 280000, daysLate: 8, lastReminderAt: "Il y a 2j", lastReminderChannel: "sms", status: "Impayé", autoReminded: false },
  { id: "r3", tenant: "Coulibaly Seydou", property: "Studio Marcory", amount: 150000, daysLate: 3, lastReminderAt: "Aujourd'hui", lastReminderChannel: "auto", status: "Relancé", autoReminded: true },
  { id: "r4", tenant: "Bamba Fatou", property: "Duplex Deux-Plateaux", amount: 420000, daysLate: 1, lastReminderAt: null, lastReminderChannel: null, status: "En retard", autoReminded: false },
  { id: "r5", tenant: "N'Guessan Aya", property: "Appt Cocody", amount: 200000, daysLate: 1, lastReminderAt: null, lastReminderChannel: null, status: "En retard", autoReminded: false },
  { id: "r6", tenant: "Koné Ibrahim", property: "Villa Riviera 3", amount: 350000, daysLate: 2, lastReminderAt: "Hier", lastReminderChannel: "email", status: "Relancé", autoReminded: true },
  { id: "r7", tenant: "Diallo Aïssatou", property: "Studio Angré", amount: 120000, daysLate: 5, lastReminderAt: "Il y a 3j", lastReminderChannel: "sms", status: "En retard", autoReminded: false },
  { id: "r8", tenant: "Aka Eric", property: "Appt Marcory Rés.", amount: 180000, daysLate: 6, lastReminderAt: "Il y a 1j", lastReminderChannel: "email", status: "En retard", autoReminded: false },
];

interface Sequence {
  id: string;
  step: string;
  stepColor: "success" | "warning" | "destructive" | "muted";
  name: string;
  description: string;
  active: boolean;
  delayDays: number;
  channels: Channel[]; // au moins un canal — par défaut email + sms
  emailSubject: string;
  emailBody: string;
  smsBody: string;
  sendTime: string; // format "HH:mm" — heure locale d'envoi
}

const initialSequences: Sequence[] = [
  {
    id: "s1", step: "J-3", stepColor: "success", name: "Rappel avant échéance",
    description: "Email + SMS · 3 jours avant la date", active: true, delayDays: -3,
    channels: ["email", "sms"], sendTime: "09:00",
    emailSubject: "Rappel : votre loyer arrive à échéance",
    emailBody: "Bonjour [Prénom],\n\nNous vous rappelons que votre loyer de [Montant] pour [Bien] est dû le [Date échéance].\n\nLien de paiement : [Lien paiement]\n\nCordialement,\n[Nom agence]",
    smsBody: "Bonjour [Prénom], votre loyer de [Montant] pour [Bien] est dû le [Date échéance]. — [Nom agence]",
  },
  {
    id: "s2", step: "J+1", stepColor: "warning", name: "Relance J+1",
    description: "Email + SMS · 1 jour après l'échéance", active: true, delayDays: 1,
    channels: ["email", "sms"], sendTime: "09:00",
    emailSubject: "Loyer en retard de paiement",
    emailBody: "Bonjour [Prénom],\n\nVotre loyer de [Montant] pour [Bien] n'a pas encore été reçu. Merci de régulariser votre situation dans les plus brefs délais.\n\nCordialement,\n[Nom agence]",
    smsBody: "Bonjour [Prénom], votre loyer de [Montant] pour [Bien] n'a pas été reçu. Merci de régulariser. — [Nom agence]",
  },
  {
    id: "s3", step: "J+7", stepColor: "destructive", name: "Relance urgente",
    description: "Email + SMS · 7 jours après l'échéance", active: true, delayDays: 7,
    channels: ["email", "sms"], sendTime: "09:00",
    emailSubject: "Relance urgente — loyer impayé",
    emailBody: "Bonjour [Prénom],\n\nVotre loyer de [Montant] pour [Bien] est en retard de 7 jours. Merci de régulariser sous 48h pour éviter toute procédure.\n\nCordialement,\n[Nom agence]",
    smsBody: "[Prénom], votre loyer de [Montant] est en retard de 7 jours. Régularisez sous 48h. — [Nom agence]",
  },
  {
    id: "s4", step: "J+15", stepColor: "muted", name: "Mise en demeure",
    description: "Email + SMS · 15 jours après l'échéance", active: false, delayDays: 15,
    channels: ["email", "sms"], sendTime: "09:00",
    emailSubject: "Mise en demeure",
    emailBody: "Bonjour [Prénom],\n\nFaute de règlement de [Montant] pour [Bien], nous vous mettons en demeure de payer sous 8 jours.\n\nCordialement,\n[Nom agence]",
    smsBody: "[Prénom], mise en demeure : régularisez [Montant] sous 8 jours. — [Nom agence]",
  },
];

interface HistoryItem {
  id: string;
  tenant: string;
  channel: Channel;
  date: string;
}

// ----------------- Helpers -----------------

const fmtFCFA = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";

const monthLabel = (() => {
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
})();

function DelayBadge({ days }: { days: number }) {
  if (days === 0) return <Badge className="bg-warning/15 text-warning border border-warning/30 hover:bg-warning/15">Aujourd'hui</Badge>;
  if (days > 7) return <Badge className="bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/15">{days} jours</Badge>;
  return <Badge className="bg-warning/15 text-warning border border-warning/30 hover:bg-warning/15">{days} jours</Badge>;
}

function StatusBadge({ status }: { status: ReminderStatus }) {
  if (status === "Impayé") return <Badge className="bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/15">Impayé</Badge>;
  if (status === "En retard") return <Badge className="bg-warning/15 text-warning border border-warning/30 hover:bg-warning/15">En retard</Badge>;
  return <Badge className="bg-success/15 text-success border border-success/30 hover:bg-success/15">Relancé</Badge>;
}

function ChannelTag({ channel }: { channel: Channel }) {
  const map: Record<Channel, { label: string; className: string; letter: string }> = {
    email: { label: "Email", className: "bg-info/15 text-info border-info/30", letter: "@" },
    sms: { label: "SMS", className: "bg-success/15 text-success border-success/30", letter: "S" },
  };
  const cfg = map[channel];
  return (
    <div className="flex items-center gap-2">
      <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold", cfg.className)}>
        {cfg.letter}
      </span>
      <span className="text-sm">{cfg.label}</span>
    </div>
  );
}


// ----------------- Main page -----------------

export default function Relances() {
  const navigate = useNavigate();
  const { hasFeature, planName, loading: planLoading } = useFeatureAccess();

  // Capacités selon le plan
  const isPro = hasFeature("sms_auto_full") || hasFeature("sms_schedule") || hasFeature("sms_templates_edit");
  // Starter et Pro peuvent tous deux personnaliser les modèles (email + SMS)
  const canEditTemplates = true;
  // Envoi manuel : réservé à Pro/Business
  const canManualSend = isPro;
  const canEmail = canManualSend;
  const canSms = canManualSend;
  // Nombre maximum de séquences activables simultanément
  const maxActiveSequences = isPro ? 3 : 1;
  // Création de séquence personnalisée : Pro+
  const canCreateSequence = isPro;
  // Quota mensuel d'envois manuels (Pro uniquement, configurable côté admin SaaS plus tard)
  const monthlyManualQuota = isPro ? 50 : 0;

  const [globalActive, setGlobalActive] = useState(true);
  const [confirmOff, setConfirmOff] = useState(false);
  const [reminders, setReminders] = useState(initialReminders);
  const [sequences, setSequences] = useState(initialSequences);
  const [previousSeqStates, setPreviousSeqStates] = useState<Record<string, boolean> | null>(null);
  const [filter, setFilter] = useState<"all" | "auto" | "manual">("all");
  const [sortKey, setSortKey] = useState<"daysLate" | "amount">("daysLate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [manualTarget, setManualTarget] = useState<UrgentReminder | null>(null);
  const [detailReminder, setDetailReminder] = useState<UrgentReminder | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSeq, setEditingSeq] = useState<Sequence | null>(null);
  const [newSeqOpen, setNewSeqOpen] = useState(false);
  // Compteur local d'envois manuels du mois en cours (mock — à brancher en BDD plus tard)
  const [manualSentThisMonth, setManualSentThisMonth] = useState(0);
  const [quotaReachedOpen, setQuotaReachedOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 8;

  // Charger l'historique réel des relances envoyées (mois en cours)
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      const monthStart = startOfMonth(new Date()).toISOString();

      const [emailRes, smsRes, tenantsRes] = await Promise.all([
        supabase
          .from("email_reminder_logs")
          .select("id,sent_at,recipient_email,rent_payment_id")
          .eq("organization_id", orgId)
          .eq("status", "sent")
          .gte("sent_at", monthStart)
          .order("sent_at", { ascending: false })
          .limit(500),
        supabase
          .from("sms_messages")
          .select("id,sent_at,created_at,recipient_name,recipient_phone,tenant_id,status")
          .eq("organization_id", orgId)
          .in("status", ["sent", "delivered"])
          .gte("created_at", monthStart)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("tenants")
          .select("id,full_name,email,unit_id,units!inner(property_id,properties!inner(organization_id))")
          .eq("units.properties.organization_id", orgId),
      ]);

      const tenantsByEmail = new Map<string, string>();
      const tenantsById = new Map<string, string>();
      const rentPaymentTenantMap = new Map<string, string>();
      for (const t of (tenantsRes.data as any[]) || []) {
        if (t.email) tenantsByEmail.set(String(t.email).toLowerCase(), t.full_name);
        tenantsById.set(t.id, t.full_name);
      }

      // Récupérer les noms via rent_payments si nécessaire (emails)
      const emailRows = (emailRes.data || []) as any[];
      const missingRentIds = Array.from(
        new Set(
          emailRows
            .filter((r) => r.recipient_email && !tenantsByEmail.get(String(r.recipient_email).toLowerCase()))
            .map((r) => r.rent_payment_id)
            .filter(Boolean)
        )
      );
      if (missingRentIds.length > 0) {
        const { data: rps } = await supabase
          .from("rent_payments")
          .select("id,tenant_id")
          .in("id", missingRentIds);
        for (const rp of rps || []) rentPaymentTenantMap.set(rp.id, rp.tenant_id);
      }

      const items: HistoryItem[] = [];
      for (const r of emailRows) {
        const lookupName = tenantsByEmail.get(String(r.recipient_email || "").toLowerCase());
        const fallbackName =
          lookupName ||
          tenantsById.get(rentPaymentTenantMap.get(r.rent_payment_id) || "") ||
          r.recipient_email ||
          "—";
        items.push({
          id: `e_${r.id}`,
          tenant: fallbackName,
          channel: "email",
          date: format(new Date(r.sent_at), "dd MMM", { locale: fr }),
        });
      }
      for (const s of (smsRes.data || []) as any[]) {
        const name = s.recipient_name || tenantsById.get(s.tenant_id || "") || s.recipient_phone || "—";
        items.push({
          id: `s_${s.id}`,
          tenant: name,
          channel: "sms",
          date: format(new Date(s.sent_at || s.created_at), "dd MMM", { locale: fr }),
        });
      }

      // Tri global desc (plus récent d'abord)
      items.sort((a, b) => (a.id < b.id ? 1 : -1));
      if (!cancelled) {
        setHistory(items);
        setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const manualRemaining = Math.max(monthlyManualQuota - manualSentThisMonth, 0);
  const quotaReached = isPro && manualSentThisMonth >= monthlyManualQuota;
  const quotaRatio = monthlyManualQuota > 0 ? manualSentThisMonth / monthlyManualQuota : 0;
  const quotaWarning = isPro && quotaRatio >= 0.8 && !quotaReached;

  const upgradeNotice = (msg: string) => {
    toast.error(msg, {
      action: { label: "Voir les offres", onClick: () => navigate("/settings?tab=subscription") },
    });
  };

  // Quand le plan charge, plafonner le nombre de séquences actives selon la limite
  useEffect(() => {
    if (planLoading) return;
    setSequences(prev => {
      let kept = 0;
      return prev.map(s => {
        if (s.active && kept < maxActiveSequences) {
          kept += 1;
          return s;
        }
        return s.active ? { ...s, active: false } : s;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planLoading, maxActiveSequences]);

  // KPIs
  const kpiToRemind = reminders.length;
  const kpiAmount = reminders.reduce((s, r) => s + r.amount, 0);
  const kpiSentEmails = 18; // mock count for the month
  const kpiSentSms = 11;
  const kpiSentTotal = kpiSentEmails + kpiSentSms;
  const kpiResponseRate = 64; // mock %
  const kpiAvgDays = 3;

  // Détermine la prochaine séquence auto applicable selon le retard et les séquences actives
  const getPlannedSequence = (daysLate: number): Sequence | null => {
    const active = sequences.filter(s => s.active && globalActive);
    if (active.length === 0) return null;
    // On cherche la séquence dont delayDays est le plus proche (≤ daysLate) ou la prochaine à venir
    const past = active.filter(s => s.delayDays <= daysLate).sort((a, b) => b.delayDays - a.delayDays);
    if (past.length > 0) return past[0];
    const next = active.filter(s => s.delayDays > daysLate).sort((a, b) => a.delayDays - b.delayDays);
    return next[0] || null;
  };

  // Filter + sort
  const filtered = useMemo(() => {
    let list = reminders;
    if (filter === "auto") list = list.filter(r => r.daysLate < 7);
    else if (filter === "manual") list = list.filter(r => r.daysLate >= 7);
    const sorted = [...list].sort((a, b) => {
      const av = sortKey === "daysLate" ? a.daysLate : a.amount;
      const bv = sortKey === "daysLate" ? b.daysLate : b.amount;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return sorted;
  }, [reminders, filter, sortKey, sortDir]);

  const counts = {
    all: reminders.length,
    auto: reminders.filter(r => r.daysLate < 7).length,
    manual: reminders.filter(r => r.daysLate >= 7).length,
  };

  // Pagination — Calendrier des relances
  const REMINDERS_PAGE_SIZE = 8;
  const [remindersPage, setRemindersPage] = useState(1);
  useEffect(() => { setRemindersPage(1); }, [filter, sortKey, sortDir]);
  const remindersTotalPages = Math.max(1, Math.ceil(filtered.length / REMINDERS_PAGE_SIZE));
  const pagedReminders = useMemo(
    () => filtered.slice((remindersPage - 1) * REMINDERS_PAGE_SIZE, remindersPage * REMINDERS_PAGE_SIZE),
    [filtered, remindersPage]
  );

  // Actions
  const sendReminder = (r: UrgentReminder, channel: "email" | "sms") => {
    if (!canManualSend) {
      upgradeNotice("L'envoi manuel de relances est réservé aux offres Pro et Business.");
      return;
    }
    if (manualSentThisMonth >= monthlyManualQuota) {
      setQuotaReachedOpen(true);
      return;
    }
    const label = channel === "email" ? "Email" : "SMS";
    const firstName = r.tenant.split(" ")[0];
    setReminders(prev => prev.map(x => x.id === r.id
      ? { ...x, lastReminderAt: "À l'instant", lastReminderChannel: channel, status: "Relancé" as ReminderStatus }
      : x));
    setManualSentThisMonth(n => n + 1);
    const newRemaining = monthlyManualQuota - (manualSentThisMonth + 1);
    toast.success(`Relance envoyée à ${firstName} par ${label} ✓`, {
      description: `Quota : ${manualSentThisMonth + 1}/${monthlyManualQuota} envois manuels ce mois (${newRemaining} restants)`,
    });
  };

  const markAsPaid = (r: UrgentReminder) => {
    const firstName = r.tenant.split(" ")[0];
    setReminders(prev => prev.filter(x => x.id !== r.id));
    setDetailReminder(null);
    toast.success(`Paiement enregistré pour ${firstName} ✓`);
  };

  const handleToggleGlobal = (next: boolean) => {
    if (!next) {
      setConfirmOff(true);
      return;
    }
    setGlobalActive(true);
    if (previousSeqStates) {
      setSequences(prev => prev.map(s => ({ ...s, active: previousSeqStates[s.id] ?? s.active })));
      setPreviousSeqStates(null);
    }
  };

  const confirmDisable = () => {
    setPreviousSeqStates(Object.fromEntries(sequences.map(s => [s.id, s.active])));
    setSequences(prev => prev.map(s => ({ ...s, active: false })));
    setGlobalActive(false);
    setConfirmOff(false);
  };

  const toggleSequence = (id: string) => {
    if (!globalActive) {
      toast.error("Activez d'abord les relances en haut de la page.");
      return;
    }
    const target = sequences.find(s => s.id === id);
    if (!target) return;
    // Activation : vérifier la limite du plan
    if (!target.active) {
      const activeCount = sequences.filter(s => s.active).length;
      if (activeCount >= maxActiveSequences) {
        upgradeNotice(
          isPro
            ? `Votre offre permet ${maxActiveSequences} séquences actives simultanément.`
            : `L'offre Starter permet une seule séquence active. Passez à Pro pour en activer jusqu'à 3.`
        );
        return;
      }
    }
    setSequences(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const openEditor = (seq?: Sequence) => {
    setEditingSeq(seq ?? sequences[0]);
    setEditorOpen(true);
  };

  const insertVariable = (variable: string, target: "emailBody" | "smsBody" | "emailSubject" = "emailBody") => {
    if (!editingSeq) return;
    setEditingSeq({ ...editingSeq, [target]: (editingSeq[target] || "") + ` ${variable}` });
  };

  const saveSequence = () => {
    if (!editingSeq) return;
    if (!canEditTemplates) {
      upgradeNotice("L'édition des modèles de relance est réservée aux offres Pro et Business.");
      return;
    }
    setSequences(prev => prev.map(s => s.id === editingSeq.id ? editingSeq : s));
    setEditorOpen(false);
    toast.success("Séquence enregistrée ✓");
  };

  const stepBg: Record<Sequence["stepColor"], string> = {
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    destructive: "bg-destructive/15 text-destructive border-destructive/30",
    muted: "bg-muted text-muted-foreground border-border",
  };

  const variables = ["[Prénom]", "[Montant]", "[Date échéance]", "[Bien]", "[Lien paiement]", "[Nom agence]"];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">Relances automatiques</h1>
              {!planLoading && planName && (
                <Badge variant="outline" className="text-xs">Offre {planName}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Suivi et gestion des relances loyers — {monthLabel}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Switch checked={globalActive} onCheckedChange={handleToggleGlobal} id="global-toggle" />
              <Label htmlFor="global-toggle" className={cn("text-sm font-medium cursor-pointer", globalActive ? "text-success" : "text-muted-foreground")}>
                Relances {globalActive ? "actives" : "désactivées"}
              </Label>
            </div>
            <Button
              variant="outline"
              onClick={() => setTestOpen(true)}
              className="gap-2"
            >
              <FlaskConical className="h-4 w-4" /> Tester l'envoi
            </Button>
            {canCreateSequence ? (
              <Button onClick={() => setNewSeqOpen(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" /> Nouvelle séquence
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => upgradeNotice("La création de séquences personnalisées est réservée aux offres Pro et Business.")}
                  >
                    <Lock className="h-3.5 w-3.5" /> Nouvelle séquence
                    <Sparkles className="h-3.5 w-3.5 text-warning" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Disponible avec l'offre Pro</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Plan limitation banner */}
        {!planLoading && !isPro && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-foreground">
                Vous êtes sur l'offre {planName}
              </p>
              <p className="text-muted-foreground mt-0.5">
                Vous pouvez activer <strong>1 séquence automatique</strong> et personnaliser vos modèles
                (email et SMS). Passez à l'offre <strong>Pro</strong> pour activer jusqu'à 3 séquences
                et débloquer l'envoi manuel des relances.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/settings?tab=subscription")}
              className="flex-shrink-0"
            >
              Passer à Pro
            </Button>
          </div>
        )}

        {/* Quota d'envois manuels (Pro) */}
        {!planLoading && isPro && (
          <div className={cn(
            "rounded-lg border px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
            quotaReached
              ? "border-destructive/40 bg-destructive/5"
              : quotaWarning
                ? "border-warning/40 bg-warning/5"
                : "border-border bg-card"
          )}>
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Send className={cn(
                "h-5 w-5 flex-shrink-0 mt-0.5",
                quotaReached ? "text-destructive" : quotaWarning ? "text-warning" : "text-muted-foreground"
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Envois manuels — {manualSentThisMonth} / {monthlyManualQuota} ce mois
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {quotaReached
                    ? "Quota mensuel atteint. Les nouveaux envois manuels sont bloqués jusqu'au mois prochain."
                    : quotaWarning
                      ? `Plus que ${manualRemaining} envoi${manualRemaining > 1 ? "s" : ""} disponible${manualRemaining > 1 ? "s" : ""} ce mois.`
                      : `${manualRemaining} envoi${manualRemaining > 1 ? "s" : ""} restant${manualRemaining > 1 ? "s" : ""}. Les relances automatiques ne sont pas comptées.`}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all",
                      quotaReached ? "bg-destructive" : quotaWarning ? "bg-warning" : "bg-success"
                    )}
                    style={{ width: `${Math.min(quotaRatio * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            {(quotaWarning || quotaReached) && (
              <Button
                size="sm"
                variant={quotaReached ? "default" : "outline"}
                onClick={() => navigate("/settings?tab=subscription")}
                className="flex-shrink-0"
              >
                Passer à Business
              </Button>
            )}
          </div>
        )}

        {/* KPI cards */}
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">À relancer</p>
              <p className={cn("text-3xl font-bold", kpiToRemind > 0 ? "text-warning" : "text-success")}>
                {kpiToRemind}
              </p>
              <p className="text-xs text-muted-foreground">locataires en retard</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Envoyées ce mois</p>
              <p className="text-3xl font-bold text-foreground">{kpiSentTotal}</p>
              <p className="text-xs text-muted-foreground">{kpiSentEmails} emails · {kpiSentSms} SMS</p>
              {!globalActive && (
                <div className="mt-2 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  Relances suspendues
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taux de réponse</p>
              <p className={cn(
                "text-3xl font-bold",
                kpiResponseRate > 60 ? "text-success" : kpiResponseRate >= 30 ? "text-warning" : "text-destructive"
              )}>
                {kpiResponseRate}%
              </p>
              <p className="text-xs text-muted-foreground">paiement dans {kpiAvgDays}j en moyenne</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Montant relancé</p>
              <p className={cn("text-2xl font-bold", kpiAmount > 0 ? "text-destructive" : "text-foreground")}>
                {fmtFCFA(kpiAmount)}
              </p>
              <p className="text-xs text-muted-foreground">en attente</p>
            </CardContent>
          </Card>
        </div>

        {/* Section 2 — Calendrier des relances */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Calendrier des relances
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Relances automatiques planifiées. À partir de 7 jours de retard, vous pouvez relancer manuellement.
              </p>
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">Tous ({counts.all})</TabsTrigger>
                <TabsTrigger value="auto">Auto ({counts.auto})</TabsTrigger>
                <TabsTrigger value="manual">Manuel possible ({counts.manual})</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Locataire</TableHead>
                    <TableHead>Bien</TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => { setSortKey("amount"); setSortDir(d => sortKey === "amount" && d === "desc" ? "asc" : "desc"); }}
                      >
                        Montant
                        {sortKey === "amount" ? (sortDir === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => { setSortKey("daysLate"); setSortDir(d => sortKey === "daysLate" && d === "desc" ? "asc" : "desc"); }}
                      >
                        Retard
                        {sortKey === "daysLate" ? (sortDir === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                      </button>
                    </TableHead>
                    <TableHead>Relance prévue</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucune relance planifiée.
                      </TableCell>
                    </TableRow>
                  )}
                  {pagedReminders.map((r) => {
                    const planned = getPlannedSequence(r.daysLate);
                    const manualEligible = r.daysLate >= 7;
                    return (
                      <TableRow
                        key={r.id}
                        className={cn(
                          "cursor-pointer",
                          manualEligible && "bg-destructive/5 hover:bg-destructive/10"
                        )}
                        onClick={() => setDetailReminder(r)}
                      >
                        <TableCell className="font-medium">{r.tenant}</TableCell>
                        <TableCell className="text-muted-foreground">{r.property}</TableCell>
                        <TableCell className="font-semibold">{fmtFCFA(r.amount)}</TableCell>
                        <TableCell><DelayBadge days={r.daysLate} /></TableCell>
                        <TableCell>
                          {planned ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-normal">{planned.step}</Badge>
                              <span className="text-xs text-muted-foreground">{planned.name}</span>
                              <div className="flex items-center gap-1">
                                {planned.channels.map(c => (
                                  <span
                                    key={c}
                                    className="inline-flex items-center justify-center rounded-md border border-border bg-muted h-5 w-5"
                                    title={c === "email" ? "Email" : "SMS"}
                                  >
                                    {c === "email" ? <Mail className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Aucune séquence active</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {manualEligible ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!canManualSend || quotaReached}
                              onClick={() => setManualTarget(r)}
                            >
                              <Send className="h-3.5 w-3.5" /> Relancer manuellement
                            </Button>
                          ) : (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-normal gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Auto
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border">
              {pagedReminders.map(r => {
                const planned = getPlannedSequence(r.daysLate);
                const manualEligible = r.daysLate >= 7;
                return (
                  <button
                    key={r.id}
                    onClick={() => setDetailReminder(r)}
                    className={cn(
                      "w-full text-left p-4 space-y-2",
                      manualEligible && "bg-destructive/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{r.tenant}</p>
                        <p className="text-xs text-muted-foreground">{r.property}</p>
                      </div>
                      <DelayBadge days={r.daysLate} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{fmtFCFA(r.amount)}</span>
                      {manualEligible ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!canManualSend || quotaReached}
                          onClick={(e) => { e.stopPropagation(); setManualTarget(r); }}
                        >
                          <Send className="h-3.5 w-3.5" /> Relancer
                        </Button>
                      ) : (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-normal gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Auto {planned ? planned.step : ""}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {filtered.length > 0 && (
              <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {(remindersPage - 1) * REMINDERS_PAGE_SIZE + 1}
                  –
                  {Math.min(remindersPage * REMINDERS_PAGE_SIZE, filtered.length)} sur {filtered.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={remindersPage <= 1}
                    onClick={() => setRemindersPage(p => Math.max(1, p - 1))}
                  >
                    Précédent
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {remindersPage} / {remindersTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={remindersPage >= remindersTotalPages}
                    onClick={() => setRemindersPage(p => Math.min(remindersTotalPages, p + 1))}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3 — two columns */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sequences */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Séquences actives</CardTitle>
              <Button size="sm" variant="outline" onClick={() => openEditor()}>Gérer</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sequences.map(seq => (
                <div key={seq.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className={cn("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold", stepBg[seq.stepColor])}>
                    {seq.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{seq.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{seq.description}</p>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {seq.sendTime}
                      </span>
                      {seq.channels.map(c => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground"
                        >
                          {c === "email" ? <Mail className="h-2.5 w-2.5" /> : <Smartphone className="h-2.5 w-2.5" />}
                          {c === "email" ? "Email" : "SMS"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {seq.active && globalActive ? (
                      <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/15">Actif</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        {globalActive ? "Pause" : "Suspendu"}
                      </Badge>
                    )}
                    <Switch
                      checked={seq.active && globalActive}
                      onCheckedChange={() => toggleSequence(seq.id)}
                      disabled={!globalActive}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Historique récent</CardTitle>
              <span className="text-xs text-muted-foreground">Ce mois</span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Locataire</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Envoyé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        Chargement…
                      </TableCell>
                    </TableRow>
                  ) : history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        Aucune relance envoyée ce mois.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history
                      .slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE)
                      .map(h => (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.tenant}</TableCell>
                          <TableCell><ChannelTag channel={h.channel} /></TableCell>
                          <TableCell className="text-muted-foreground text-sm">{h.date}</TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
              {!historyLoading && history.length > 0 && (() => {
                const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
                const from = (historyPage - 1) * HISTORY_PAGE_SIZE + 1;
                const to = Math.min(historyPage * HISTORY_PAGE_SIZE, history.length);
                return (
                  <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {from}–{to} sur {history.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage <= 1}
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      >
                        Précédent
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {historyPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage >= totalPages}
                        onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                );
              })()}
              <div className="border-t border-border px-4 py-3 text-right">
                <Link to="/relances/historique" className="text-sm font-medium text-primary hover:underline">
                  Voir tout l'historique →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm disable dialog */}
      <Dialog open={confirmOff} onOpenChange={setConfirmOff}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Êtes-vous sûr ?</DialogTitle>
            <DialogDescription>
              {reminders.length} relances programmées seront suspendues.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOff(false)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDisable}>Désactiver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quota atteint dialog */}
      <Dialog open={quotaReachedOpen} onOpenChange={setQuotaReachedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Quota mensuel atteint
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                Vous avez utilisé vos <strong>{monthlyManualQuota} envois manuels</strong> inclus
                dans l'offre <strong>{planName}</strong> pour ce mois-ci.
              </span>
              <span className="block">
                Les <strong>relances automatiques</strong> de vos séquences continuent de fonctionner
                normalement et ne sont pas comptées dans ce quota.
              </span>
              <span className="block">
                Pour envoyer davantage de relances manuelles, passez à l'offre
                <strong> Business</strong> (envois illimités) ou attendez le renouvellement
                de votre quota le <strong>1er du mois prochain</strong>.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuotaReachedOpen(false)}>Compris</Button>
            <Button onClick={() => { setQuotaReachedOpen(false); navigate("/settings?tab=subscription"); }}>
              Voir l'offre Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sequence editor drawer */}
      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Éditeur de séquence</SheetTitle>
            <SheetDescription>
              Personnalisez l'étape sélectionnée (objet, message, canal et délai).
            </SheetDescription>
          </SheetHeader>
          {editingSeq && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                {sequences.map(s => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={editingSeq.id === s.id ? "default" : "outline"}
                    onClick={() => setEditingSeq(s)}
                  >
                    {s.step}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Délai (jours)</Label>
                  <Input
                    type="number"
                    value={editingSeq.delayDays}
                    disabled={!canEditTemplates}
                    onChange={e => setEditingSeq({ ...editingSeq, delayDays: Number(e.target.value) })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Négatif = avant échéance · Positif = après
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Heure d'envoi</Label>
                  <Input
                    type="time"
                    value={editingSeq.sendTime}
                    disabled={!canEditTemplates}
                    onChange={e => setEditingSeq({ ...editingSeq, sendTime: e.target.value || "09:00" })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Heure locale Abidjan (GMT). Par défaut : 09:00 GMT.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Canaux d'envoi</Label>
                <div className="flex gap-2">
                  {(["email", "sms"] as Channel[]).map(c => {
                    const selected = editingSeq.channels.includes(c);
                    return (
                      <Button
                        key={c}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        disabled={!canEditTemplates}
                        onClick={() => {
                          const next = selected
                            ? editingSeq.channels.filter(x => x !== c)
                            : [...editingSeq.channels, c];
                          // Au moins un canal doit rester sélectionné
                          if (next.length === 0) {
                            toast.error("Sélectionnez au moins un canal d'envoi.");
                            return;
                          }
                          setEditingSeq({ ...editingSeq, channels: next });
                        }}
                      >
                        {c === "email" ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                        {c === "email" ? "Email" : "SMS"}
                        {selected && <CheckCircle2 className="h-3.5 w-3.5 ml-1" />}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Vous pouvez activer Email et SMS simultanément pour cette étape.
                </p>
              </div>
              {/* Modèle Email */}
              {editingSeq.channels.includes("email") && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-info" />
                    <h4 className="text-sm font-semibold">Modèle Email</h4>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Objet de l'email</Label>
                    <Input
                      value={editingSeq.emailSubject}
                      disabled={!canEditTemplates}
                      onChange={e => setEditingSeq({ ...editingSeq, emailSubject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Corps de l'email</Label>
                    <Textarea
                      rows={6}
                      value={editingSeq.emailBody}
                      disabled={!canEditTemplates}
                      onChange={e => setEditingSeq({ ...editingSeq, emailBody: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Insérer une variable</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {variables.map(v => (
                        <button
                          key={v}
                          type="button"
                          disabled={!canEditTemplates}
                          onClick={() => insertVariable(v, "emailBody")}
                          className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium hover:bg-primary hover:text-primary-foreground transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Modèle SMS */}
              {editingSeq.channels.includes("sms") && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-success" />
                    <h4 className="text-sm font-semibold">Modèle SMS</h4>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {editingSeq.smsBody.length} car. · {Math.ceil(editingSeq.smsBody.length / 160) || 1} SMS
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Message SMS</Label>
                    <Textarea
                      rows={4}
                      value={editingSeq.smsBody}
                      disabled={!canEditTemplates}
                      onChange={e => setEditingSeq({ ...editingSeq, smsBody: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Restez concis : 160 caractères = 1 SMS facturé.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Insérer une variable</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {variables.map(v => (
                        <button
                          key={v}
                          type="button"
                          disabled={!canEditTemplates}
                          onClick={() => insertVariable(v, "smsBody")}
                          className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium hover:bg-primary hover:text-primary-foreground transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                La variable <code>[Nom agence]</code> reprend automatiquement le nom de votre organisation et fait office de signature.
              </p>
            </div>
          )}
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Annuler</Button>
            <Button onClick={saveSequence}>Enregistrer</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* New sequence dialog (simple stub) */}
      <Dialog open={newSeqOpen} onOpenChange={setNewSeqOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle séquence</DialogTitle>
            <DialogDescription>
              Créez une étape de relance personnalisée. Vous pourrez en modifier les détails ensuite.
            </DialogDescription>
          </DialogHeader>
          <NewSequenceForm
            onCancel={() => setNewSeqOpen(false)}
            onCreate={(seq) => {
              setSequences(prev => [...prev, seq]);
              setNewSeqOpen(false);
              toast.success("Séquence créée ✓");
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Sheet open={!!detailReminder} onOpenChange={(o) => !o && setDetailReminder(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {detailReminder && (
            <>
              <SheetHeader>
                <SheetTitle>{detailReminder.tenant}</SheetTitle>
                <SheetDescription>{detailReminder.property}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Montant dû</p>
                  <p className="text-2xl font-bold text-destructive">{fmtFCFA(detailReminder.amount)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <DelayBadge days={detailReminder.daysLate} />
                    <StatusBadge status={detailReminder.status} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Historique des relances</p>
                  <div className="space-y-2">
                    {[
                      { date: "Aujourd'hui", channel: "email", res: "Ouvert" },
                      { date: "Il y a 3j", channel: "sms", res: "Sans réponse" },
                      { date: "Il y a 7j", channel: "email", res: "Ouvert" },
                      { date: "Il y a 12j", channel: "email", res: "Sans réponse" },
                      { date: "Il y a 18j", channel: "sms", res: "Sans réponse" },
                      { date: "Il y a 25j", channel: "email", res: "Ouvert" },
                    ].map((h, i) => (
                      <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{h.date}</span>
                          <span className="font-medium capitalize">{h.channel}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{h.res}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <SheetFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={() => markAsPaid(detailReminder)}>
                  Marquer comme payé
                </Button>
                {(() => {
                  // Choix du canal préférentiel selon les capacités du plan
                  const preferred = detailReminder.daysLate > 7
                    ? (canSms ? "sms" : (canEmail ? "email" : null))
                    : (canEmail ? "email" : (canSms ? "sms" : null));
                  return (
                    <Button
                      disabled={!preferred || quotaReached}
                      onClick={() => preferred && sendReminder(detailReminder, preferred)}
                    >
                      <Send className="h-4 w-4" /> Envoyer une relance manuelle
                    </Button>
                  );
                })()}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <TestSendDialog open={testOpen} onOpenChange={setTestOpen} />

      {/* Manual reminder dialog */}
      <ManualReminderDialog
        target={manualTarget}
        sequences={sequences}
        canEmail={canEmail}
        canSms={canSms}
        quotaReached={quotaReached}
        onClose={() => setManualTarget(null)}
        onSend={(channels, sequenceId) => {
          if (!manualTarget) return;
          const seq = sequences.find(s => s.id === sequenceId);
          const channelLabel = channels.map(c => c === "email" ? "Email" : "SMS").join(" + ");
          channels.forEach(c => sendReminder(manualTarget, c));
          toast.success(`Relance manuelle envoyée à ${manualTarget.tenant.split(" ")[0]} (${channelLabel}) ✓`, {
            description: seq ? `Modèle : ${seq.name}` : undefined,
          });
          setManualTarget(null);
        }}
      />
    </AppLayout>
  );
}

// ----------------- Sub-components -----------------

function NewSequenceForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (s: Sequence) => void }) {
  const [name, setName] = useState("");
  const [delay, setDelay] = useState(0);
  const [channels, setChannels] = useState<Channel[]>(["email", "sms"]);
  const [sendTime, setSendTime] = useState("09:00");

  const toggleChannel = (c: Channel) => {
    setChannels(prev => {
      const next = prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c];
      if (next.length === 0) {
        toast.error("Sélectionnez au moins un canal d'envoi.");
        return prev;
      }
      return next;
    });
  };

  const channelLabel = channels.length === 2
    ? "Email + SMS"
    : channels[0] === "email" ? "Email" : "SMS";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nom de la séquence</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Relance J+30" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Délai (jours)</Label>
          <Input type="number" value={delay} onChange={e => setDelay(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Heure d'envoi</Label>
          <Input type="time" value={sendTime} onChange={e => setSendTime(e.target.value || "09:00")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Canaux d'envoi</Label>
        <div className="flex gap-2">
          {(["email", "sms"] as Channel[]).map(c => {
            const selected = channels.includes(c);
            return (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                onClick={() => toggleChannel(c)}
              >
                {c === "email" ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                {c === "email" ? "Email" : "SMS"}
                {selected && <CheckCircle2 className="h-3.5 w-3.5 ml-1" />}
              </Button>
            );
          })}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annuler</Button>
        <Button
          disabled={!name.trim()}
          onClick={() => onCreate({
            id: `s${Date.now()}`,
            step: delay >= 0 ? `J+${delay}` : `J${delay}`,
            stepColor: delay > 7 ? "destructive" : delay > 0 ? "warning" : "success",
            name: name.trim(),
            description: `${channelLabel} · ${Math.abs(delay)} jour(s) ${delay >= 0 ? "après" : "avant"} l'échéance · ${sendTime}`,
            active: true,
            delayDays: delay,
            channels,
            emailSubject: name.trim(),
            emailBody: "Bonjour [Prénom],\n\nVotre loyer de [Montant] pour [Bien] est concerné par cette relance.\n\nCordialement,\n[Nom agence]",
            smsBody: "Bonjour [Prénom], votre loyer de [Montant] pour [Bien]. — [Nom agence]",
            sendTime,
          })}
        >
          Créer
        </Button>
      </DialogFooter>
    </div>
  );
}

// ----------------- Manual reminder dialog -----------------

function ManualReminderDialog({
  target,
  sequences,
  canEmail,
  canSms,
  quotaReached,
  onClose,
  onSend,
}: {
  target: UrgentReminder | null;
  sequences: Sequence[];
  canEmail: boolean;
  canSms: boolean;
  quotaReached: boolean;
  onClose: () => void;
  onSend: (channels: Channel[], sequenceId: string) => void;
}) {
  const [sequenceId, setSequenceId] = useState<string>("");
  const [channels, setChannels] = useState<Channel[]>(["email", "sms"]);

  // Réinit à l'ouverture
  useEffect(() => {
    if (target) {
      // pré-sélectionne la séquence la plus pertinente (≥ 7j → "Relance urgente" ou la plus tardive disponible)
      const sorted = [...sequences].sort((a, b) => b.delayDays - a.delayDays);
      const best = sorted.find(s => s.delayDays <= target.daysLate) || sorted[0];
      setSequenceId(best?.id || "");
      const next: Channel[] = [];
      if (canEmail && best?.channels.includes("email")) next.push("email");
      if (canSms && best?.channels.includes("sms")) next.push("sms");
      setChannels(next.length > 0 ? next : (canEmail ? ["email"] : canSms ? ["sms"] : []));
    }
  }, [target, sequences, canEmail, canSms]);

  const seq = sequences.find(s => s.id === sequenceId);

  const toggleChannel = (c: Channel) => {
    setChannels(prev => {
      if (prev.includes(c)) {
        if (prev.length === 1) {
          toast.error("Sélectionnez au moins un canal d'envoi.");
          return prev;
        }
        return prev.filter(x => x !== c);
      }
      return [...prev, c];
    });
  };

  const renderPreview = (text: string) => {
    if (!target) return text;
    const firstName = target.tenant.split(" ")[0];
    return text
      .split("[Prénom]").join(firstName)
      .split("[Nom]").join(target.tenant)
      .split("[Montant]").join(fmtFCFA(target.amount))
      .split("[Bien]").join(target.property)
      .split("[Date échéance]").join("la date prévue")
      .split("[Lien paiement]").join("https://…")
      .split("[Nom agence]").join("Votre agence");
  };

  const handleSend = () => {
    if (!seq || channels.length === 0) return;
    onSend(channels, seq.id);
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Relance manuelle
          </DialogTitle>
          <DialogDescription>
            {target && (
              <>
                Envoyer une relance à <strong>{target.tenant}</strong> — {target.property} ({fmtFCFA(target.amount)} · {target.daysLate}j de retard)
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-5">
            {/* Choix du modèle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Modèle de message</Label>
              <div className="grid gap-2">
                {sequences.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSequenceId(s.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition",
                      sequenceId === s.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Badge variant="outline" className="font-normal">{s.step}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Choix des canaux */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Canaux d'envoi</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canEmail}
                  onClick={() => toggleChannel("email")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                    channels.includes("email")
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background hover:bg-muted",
                    !canEmail && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Mail className="h-4 w-4" /> Email
                </button>
                <button
                  type="button"
                  disabled={!canSms}
                  onClick={() => toggleChannel("sms")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                    channels.includes("sms")
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background hover:bg-muted",
                    !canSms && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Smartphone className="h-4 w-4" /> SMS
                </button>
              </div>
            </div>

            {/* Aperçus */}
            {seq && (
              <div className="space-y-3">
                {channels.includes("email") && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Mail className="h-3 w-3" /> Aperçu email
                    </p>
                    <p className="text-sm font-semibold mb-1">{renderPreview(seq.emailSubject)}</p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{renderPreview(seq.emailBody)}</p>
                  </div>
                )}
                {channels.includes("sms") && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <Smartphone className="h-3 w-3" /> Aperçu SMS
                    </p>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{renderPreview(seq.smsBody)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={handleSend}
            disabled={!seq || channels.length === 0 || quotaReached}
          >
            <Send className="h-4 w-4" /> Envoyer la relance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
