import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LifeBuoy, Search, Link2, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TicketDetailSheet } from "@/pages/Support";

const CATEGORIES: Record<string, string> = {
  bug: "Bug", question: "Question", billing: "Facturation", feature: "Suggestion", other: "Autre",
};
const PRIORITIES: Record<string, { label: string; className: string }> = {
  low: { label: "Faible", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normale", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  high: { label: "Élevée", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  urgent: { label: "Urgente", className: "bg-destructive/10 text-destructive border-destructive/20" },
};
const STATUSES: Record<string, { label: string; className: string }> = {
  open: { label: "Ouvert", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_progress: { label: "En cours", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  waiting_user: { label: "Attente client", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  resolved: { label: "Résolu", className: "bg-success/10 text-success border-success/20" },
  closed: { label: "Fermé", className: "bg-muted text-muted-foreground border-border" },
};

interface AdminTicket {
  id: string;
  organization_id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  last_message_at: string;
  created_by: string;
  assigned_to: string | null;
  sla_due_at: string | null;
  first_response_at: string | null;
  linked_rent_payment_id: string | null;
  org_name?: string;
  assignee_name?: string | null;
}

function getSlaState(t: AdminTicket): "met" | "breached" | "due_soon" | "ok" | "none" {
  if (!t.sla_due_at) return "none";
  if (t.first_response_at) {
    return new Date(t.first_response_at) <= new Date(t.sla_due_at) ? "met" : "breached";
  }
  const diffH = (new Date(t.sla_due_at).getTime() - Date.now()) / 3.6e6;
  if (diffH < 0) return "breached";
  if (diffH < 4) return "due_soon";
  return "ok";
}

const SLA_LABELS: Record<string, { label: string; className: string }> = {
  met: { label: "SLA respecté", className: "bg-success/10 text-success border-success/20" },
  breached: { label: "SLA dépassé", className: "bg-destructive/10 text-destructive border-destructive/20" },
  due_soon: { label: "SLA imminent", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  ok: { label: "SLA OK", className: "bg-muted text-muted-foreground" },
  none: { label: "—", className: "" },
};

export default function AdminTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all"); // all | mine | unassigned
  const [slaFilter, setSlaFilter] = useState("all"); // all | breached | due_soon
  const [search, setSearch] = useState("");
  const [openTicket, setOpenTicket] = useState<AdminTicket | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [tRes, oRes, sa] = await Promise.all([
      supabase.from("support_tickets").select("*").order("last_message_at", { ascending: false }),
      supabase.from("organizations").select("id, name"),
      supabase.from("super_admins").select("user_id"),
    ]);
    const orgs = oRes.data || [];
    const adminIds = (sa.data || []).map((r: any) => r.user_id);
    const profsRes = adminIds.length
      ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", adminIds)
      : { data: [] as any[] };
    const profs = profsRes.data || [];
    const enriched: AdminTicket[] = (tRes.data || []).map((t: any) => ({
      ...t,
      org_name: orgs.find((o: any) => o.id === t.organization_id)?.name || "—",
      assignee_name: t.assigned_to
        ? (profs.find((p: any) => p.user_id === t.assigned_to)?.full_name
           || profs.find((p: any) => p.user_id === t.assigned_to)?.email
           || "Assigné")
        : null,
    }));
    setTickets(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => tickets.filter(t => {
    if (statusFilter === "active" && (t.status === "closed" || t.status === "resolved")) return false;
    if (statusFilter !== "all" && statusFilter !== "active" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (assignedFilter === "mine" && t.assigned_to !== user?.id) return false;
    if (assignedFilter === "unassigned" && t.assigned_to !== null) return false;
    if (slaFilter !== "all") {
      const s = getSlaState(t);
      if (slaFilter === "breached" && s !== "breached") return false;
      if (slaFilter === "due_soon" && s !== "due_soon") return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!t.subject.toLowerCase().includes(q) && !t.org_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [tickets, statusFilter, priorityFilter, categoryFilter, assignedFilter, slaFilter, search, user?.id]);

  const counts = useMemo(() => ({
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    breached: tickets.filter(t => getSlaState(t) === "breached" && t.status !== "closed" && t.status !== "resolved").length,
    mine: tickets.filter(t => t.assigned_to === user?.id && t.status !== "closed" && t.status !== "resolved").length,
    unassigned: tickets.filter(t => !t.assigned_to && t.status !== "closed" && t.status !== "resolved").length,
  }), [tickets, user?.id]);

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-primary" /> Tickets de support
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.open} ouverts · {counts.in_progress} en cours · {counts.unassigned} non assignés · {counts.mine} pour moi · {counts.breached} SLA dépassés
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher (sujet, agence)…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute assignation</SelectItem>
              <SelectItem value="mine">Pour moi</SelectItem>
              <SelectItem value="unassigned">Non assignés</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes priorités</SelectItem>
              {Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {Object.entries(CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={slaFilter} onValueChange={setSlaFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous SLA</SelectItem>
              <SelectItem value="breached">SLA dépassé</SelectItem>
              <SelectItem value="due_soon">SLA imminent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">Aucun ticket ne correspond à ces filtres.</CardContent></Card>
        ) : (
          <div className="grid gap-2">
            {filtered.map(t => {
              const sla = getSlaState(t);
              const slaCfg = SLA_LABELS[sla];
              return (
                <Card key={t.id} className="border-border hover:border-primary/40 transition-colors cursor-pointer" onClick={() => setOpenTicket(t)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-primary">{t.org_name}</span>
                          <span className="text-muted-foreground text-xs">·</span>
                          <p className="font-medium text-card-foreground truncate">{t.subject}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{CATEGORIES[t.category]}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${PRIORITIES[t.priority]?.className}`}>{PRIORITIES[t.priority]?.label}</Badge>
                          {sla !== "none" && (
                            <Badge variant="outline" className={`text-[10px] gap-1 ${slaCfg.className}`}>
                              {sla === "breached" ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {slaCfg.label}
                            </Badge>
                          )}
                          {t.assignee_name && (
                            <Badge variant="outline" className={`text-[10px] ${t.assigned_to === user?.id ? "bg-primary/10 text-primary border-primary/20" : ""}`}>
                              → {t.assigned_to === user?.id ? "Moi" : t.assignee_name}
                            </Badge>
                          )}
                          {!t.assigned_to && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">Non assigné</Badge>
                          )}
                          {t.linked_rent_payment_id && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Link2 className="h-3 w-3" /> Impayé lié
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            Maj. {format(new Date(t.last_message_at), "dd MMM HH:mm", { locale: fr })}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${STATUSES[t.status]?.className}`}>
                        {STATUSES[t.status]?.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <TicketDetailSheet
        ticket={openTicket as any}
        onClose={() => { setOpenTicket(null); fetchAll(); }}
        viewerRole="admin"
      />
    </SuperAdminLayout>
  );
}
