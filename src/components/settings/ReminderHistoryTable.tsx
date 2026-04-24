import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  MessageSquare,
  AlertCircle,
  Send,
  History,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { fr } from "date-fns/locale";

type AuditContext = {
  reason?: string;
  month?: string;
  payment_status?: string;
  amount_due?: number;
  amount_paid?: number;
  remaining_balance?: number;
  due_date?: string;
  rent_payment_id?: string;
  tenant_name?: string;
  schedule_slot?: number;
  schedule_day?: number;
  schedule_hour?: number;
  plan_slug?: string;
  triggered_at?: string;
} | null;

type SmsRow = {
  id: string;
  created_at: string;
  recipient_phone: string;
  recipient_name: string | null;
  content: string;
  status: string;
  trigger_type: string;
  error_message: string | null;
  audit?: AuditContext;
};

type EmailRow = {
  id: string;
  sent_at: string;
  recipient_email: string;
  template_key: string;
  status: string;
  error_message: string | null;
  audit_context: AuditContext;
};

const SMS_STATUS: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  scheduled: { label: "Programmé", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  sending: { label: "Envoi…", icon: Send, className: "bg-warning/10 text-warning border-warning/20" },
  sent: { label: "Envoyé", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  delivered: { label: "Livré", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  failed: { label: "Échoué", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "Annulé", icon: AlertCircle, className: "bg-muted text-muted-foreground border-border" },
};

const EMAIL_STATUS: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  sent: { label: "Envoyé", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  failed: { label: "Échoué", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
  bounced: { label: "Rejeté", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const TRIGGER_LABELS: Record<string, string> = {
  auto: "Auto",
  manual: "Manuel",
  test: "Test",
};

function buildMonthOptions() {
  const now = new Date();
  const opts: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    const value = format(d, "yyyy-MM");
    const label = format(d, "MMMM yyyy", { locale: fr });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts;
}

export function ReminderHistoryTable() {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [month, setMonth] = useState<string>(monthOptions[0].value);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [smsRows, setSmsRows] = useState<SmsRow[]>([]);
  const [emailRows, setEmailRows] = useState<EmailRow[]>([]);

  const fetchHistory = async () => {
    if (!orgId) return;
    setLoading(true);
    const [year, m] = month.split("-").map(Number);
    const start = startOfMonth(new Date(year, m - 1, 1)).toISOString();
    const end = endOfMonth(new Date(year, m - 1, 1)).toISOString();

    const [smsRes, emailRes] = await Promise.all([
      supabase
        .from("sms_messages")
        .select("id,created_at,recipient_phone,recipient_name,content,status,trigger_type,error_message")
        .eq("organization_id", orgId)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("email_reminder_logs")
        .select("id,sent_at,recipient_email,template_key,status,error_message,audit_context")
        .eq("organization_id", orgId)
        .gte("sent_at", start)
        .lte("sent_at", end)
        .order("sent_at", { ascending: false })
        .limit(500),
    ]);

    const smsList = (smsRes.data || []) as SmsRow[];

    // Fetch audit logs for these SMS in one query
    if (smsList.length > 0) {
      const { data: logs } = await supabase
        .from("sms_logs")
        .select("sms_message_id, details")
        .eq("event_type", "targeting_audit")
        .in(
          "sms_message_id",
          smsList.map((s) => s.id)
        );
      const auditBySms = new Map<string, AuditContext>();
      for (const l of logs || []) auditBySms.set(l.sms_message_id, l.details as AuditContext);
      for (const s of smsList) s.audit = auditBySms.get(s.id) || null;
    }

    setSmsRows(smsList);
    setEmailRows((emailRes.data || []) as EmailRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, month]);

  const filteredSms = useMemo(() => {
    if (statusFilter === "all") return smsRows;
    if (statusFilter === "sent") return smsRows.filter((r) => r.status === "sent" || r.status === "delivered");
    if (statusFilter === "failed") return smsRows.filter((r) => r.status === "failed");
    return smsRows.filter((r) => r.status === statusFilter);
  }, [smsRows, statusFilter]);

  const filteredEmail = useMemo(() => {
    if (statusFilter === "all") return emailRows;
    if (statusFilter === "sent") return emailRows.filter((r) => r.status === "sent");
    if (statusFilter === "failed") return emailRows.filter((r) => r.status === "failed" || r.status === "bounced");
    return emailRows.filter((r) => r.status === statusFilter);
  }, [emailRows, statusFilter]);

  const stats = useMemo(() => {
    const smsSent = smsRows.filter((r) => r.status === "sent" || r.status === "delivered").length;
    const smsFailed = smsRows.filter((r) => r.status === "failed").length;
    const emailSent = emailRows.filter((r) => r.status === "sent").length;
    const emailFailed = emailRows.filter((r) => r.status === "failed" || r.status === "bounced").length;
    return { smsSent, smsFailed, emailSent, emailFailed };
  }, [smsRows, emailRows]);

  const goPrev = () => {
    const [y, m] = month.split("-").map(Number);
    setMonth(format(subMonths(new Date(y, m - 1, 1), 1), "yyyy-MM"));
  };
  const goNext = () => {
    const [y, m] = month.split("-").map(Number);
    const next = addMonths(new Date(y, m - 1, 1), 1);
    if (next > new Date()) return;
    setMonth(format(next, "yyyy-MM"));
  };

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <History className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Historique des relances</CardTitle>
                <CardDescription>SMS et emails envoyés aux locataires, par mois.</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={goPrev}>‹</Button>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={goNext}>›</Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="sent">Envoyés</SelectItem>
                  <SelectItem value="failed">Échoués</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-2" onClick={fetchHistory}>
                <RefreshCw className="h-3.5 w-3.5" /> Actualiser
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatBox icon={MessageSquare} label="SMS envoyés" value={stats.smsSent} tone="success" />
            <StatBox icon={MessageSquare} label="SMS échoués" value={stats.smsFailed} tone="destructive" />
            <StatBox icon={Mail} label="Emails envoyés" value={stats.emailSent} tone="success" />
            <StatBox icon={Mail} label="Emails échoués" value={stats.emailFailed} tone="destructive" />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="email" className="space-y-3">
              <TabsList>
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="h-3.5 w-3.5" /> Emails ({filteredEmail.length})
                </TabsTrigger>
                <TabsTrigger value="sms" className="gap-2">
                  <MessageSquare className="h-3.5 w-3.5" /> SMS ({filteredSms.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <EmailTable rows={filteredEmail} />
              </TabsContent>
              <TabsContent value="sms">
                <SmsTable rows={filteredSms} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Mail;
  label: string;
  value: number;
  tone: "success" | "destructive";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/10 text-success border-success/20"
      : "bg-destructive/10 text-destructive border-destructive/20";
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-80">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground text-center py-8">{label}</p>;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  late: "En retard",
  partial: "Partiel",
  paid: "Payé",
};

function AuditCell({ audit }: { audit: AuditContext }) {
  if (!audit) return <span className="text-[11px] text-muted-foreground">—</span>;
  const fmt = (n?: number) => (n != null ? Number(n).toLocaleString("fr-FR") : "—");
  const statusLabel = audit.payment_status
    ? PAYMENT_STATUS_LABELS[audit.payment_status] || audit.payment_status
    : "—";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]">
          <Info className="h-3 w-3" />
          {statusLabel} · {fmt(audit.remaining_balance)} FCFA
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 text-xs space-y-2">
        <div className="font-medium text-sm">Pourquoi cette relance ?</div>
        <div className="text-muted-foreground">
          Le locataire avait un loyer non soldé pour le mois sélectionné.
        </div>
        <div className="grid grid-cols-2 gap-y-1 gap-x-2 pt-2 border-t border-border">
          <span className="text-muted-foreground">Mois</span>
          <span className="font-medium">{audit.month || "—"}</span>
          <span className="text-muted-foreground">Statut paiement</span>
          <span className="font-medium">{statusLabel}</span>
          <span className="text-muted-foreground">Montant dû</span>
          <span className="font-medium">{fmt(audit.amount_due)} FCFA</span>
          <span className="text-muted-foreground">Déjà payé</span>
          <span className="font-medium">{fmt(audit.amount_paid)} FCFA</span>
          <span className="text-muted-foreground">Solde restant</span>
          <span className="font-medium text-destructive">{fmt(audit.remaining_balance)} FCFA</span>
          <span className="text-muted-foreground">Échéance</span>
          <span className="font-medium">{audit.due_date || "—"}</span>
          {audit.schedule_slot != null && (
            <>
              <span className="text-muted-foreground">Créneau</span>
              <span className="font-medium">
                #{audit.schedule_slot} (jour {audit.schedule_day}, {audit.schedule_hour}h)
              </span>
            </>
          )}
          {audit.plan_slug && (
            <>
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium capitalize">{audit.plan_slug}</span>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EmailTable({ rows }: { rows: EmailRow[] }) {
  if (rows.length === 0) return <EmptyState label="Aucun email pour cette période." />;
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Destinataire</TableHead>
            <TableHead>Modèle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Audit</TableHead>
            <TableHead>Erreur</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const conf = EMAIL_STATUS[r.status] || EMAIL_STATUS.sent;
            const Icon = conf.icon;
            return (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(r.sent_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </TableCell>
                <TableCell className="text-sm">{r.recipient_email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {r.template_key}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`gap-1 text-xs font-normal ${conf.className}`}>
                    <Icon className="h-3 w-3" /> {conf.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.error_message ? (
                    <p
                      className="text-[11px] text-destructive truncate max-w-[260px]"
                      title={r.error_message}
                    >
                      {r.error_message}
                    </p>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SmsTable({ rows }: { rows: SmsRow[] }) {
  if (rows.length === 0) return <EmptyState label="Aucun SMS pour cette période." />;
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Destinataire</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Erreur</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const conf = SMS_STATUS[r.status] || SMS_STATUS.scheduled;
            const Icon = conf.icon;
            return (
              <TableRow key={r.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </TableCell>
                <TableCell>
                  {r.recipient_name && <p className="text-sm font-medium">{r.recipient_name}</p>}
                  <p className="text-xs text-muted-foreground">{r.recipient_phone}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm truncate max-w-[250px]" title={r.content}>{r.content}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {TRIGGER_LABELS[r.trigger_type] || r.trigger_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`gap-1 text-xs font-normal ${conf.className}`}>
                    <Icon className="h-3 w-3" /> {conf.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.error_message ? (
                    <p
                      className="text-[11px] text-destructive truncate max-w-[260px]"
                      title={r.error_message}
                    >
                      {r.error_message}
                    </p>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
