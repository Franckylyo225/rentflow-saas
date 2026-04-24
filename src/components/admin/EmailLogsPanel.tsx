import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollText, RefreshCw, CheckCircle2, XCircle, AlertCircle, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface PlatformEmailLog {
  id: string;
  template_key: string;
  recipient_email: string;
  subject: string;
  status: string;
  error_message: string | null;
  retry_count: number;
  organization_id: string | null;
  user_id: string | null;
  context: Record<string, any>;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "secondary"; Icon: typeof CheckCircle2 }> = {
  sent: { label: "Envoyé", variant: "default", Icon: CheckCircle2 },
  failed: { label: "Échec", variant: "destructive", Icon: XCircle },
  disabled: { label: "Désactivé", variant: "secondary", Icon: AlertCircle },
};

export function EmailLogsPanel() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [selected, setSelected] = useState<PlatformEmailLog | null>(null);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform-email-logs", statusFilter, templateFilter],
    queryFn: async () => {
      let q = supabase
        .from("platform_email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (templateFilter !== "all") q = q.eq("template_key", templateFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PlatformEmailLog[];
    },
  });

  const { data: distinctTemplates = [] } = useQuery({
    queryKey: ["platform-email-logs-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_email_logs")
        .select("template_key")
        .limit(1000);
      const set = new Set<string>();
      (data || []).forEach((r: any) => set.add(r.template_key));
      return Array.from(set).sort();
    },
  });

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.recipient_email.toLowerCase().includes(s) ||
      l.subject.toLowerCase().includes(s) ||
      l.template_key.toLowerCase().includes(s)
    );
  });

  const stats = {
    total: logs.length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
    disabled: logs.filter((l) => l.status === "disabled").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold mt-1">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Envoyés</p><p className="text-2xl font-bold mt-1 text-primary">{stats.sent}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Échecs</p><p className="text-2xl font-bold mt-1 text-destructive">{stats.failed}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Désactivés</p><p className="text-2xl font-bold mt-1 text-muted-foreground">{stats.disabled}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="h-5 w-5 text-primary" /> Journal des envois
              </CardTitle>
              <CardDescription>200 derniers emails envoyés depuis la plateforme</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Input
              placeholder="Rechercher (email, sujet, modèle)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="sent">Envoyés</SelectItem>
                <SelectItem value="failed">Échecs</SelectItem>
                <SelectItem value="disabled">Désactivés</SelectItem>
              </SelectContent>
            </Select>
            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modèles</SelectItem>
                {distinctTemplates.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun envoi enregistré</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filtered.map((log) => {
                const cfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.sent;
                const Icon = cfg.Icon;
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelected(log)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${log.status === "sent" ? "text-primary" : log.status === "failed" ? "text-destructive" : "text-muted-foreground"}`} />
                        <p className="text-sm font-medium truncate">{log.subject || log.template_key}</p>
                        {log.retry_count > 0 && (
                          <Badge variant="outline" className="text-[10px]">{log.retry_count} retry</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        <span className="font-mono">{log.template_key}</span> → {log.recipient_email}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-destructive truncate mt-0.5">{log.error_message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { locale: fr, addSuffix: true })}
                      </span>
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Détails de l'envoi</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Row label="Modèle" value={<code className="text-xs">{selected.template_key}</code>} />
              <Row label="Sujet" value={selected.subject || "—"} />
              <Row label="Destinataire" value={selected.recipient_email} />
              <Row label="Statut" value={<Badge variant={STATUS_CONFIG[selected.status]?.variant || "default"}>{STATUS_CONFIG[selected.status]?.label || selected.status}</Badge>} />
              <Row label="Tentatives" value={String(selected.retry_count)} />
              <Row label="Date" value={new Date(selected.created_at).toLocaleString("fr-FR")} />
              {selected.organization_id && <Row label="Organisation" value={<code className="text-xs">{selected.organization_id}</code>} />}
              {selected.user_id && <Row label="Utilisateur" value={<code className="text-xs">{selected.user_id}</code>} />}
              {selected.error_message && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Erreur</p>
                  <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded border border-destructive/20 whitespace-pre-wrap break-all">{selected.error_message}</pre>
                </div>
              )}
              {Object.keys(selected.context).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Contexte</p>
                  <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap break-all">{JSON.stringify(selected.context, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
