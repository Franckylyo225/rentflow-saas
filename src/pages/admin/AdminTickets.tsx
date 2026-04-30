import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, LifeBuoy, Search } from "lucide-react";
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
  org_name?: string;
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [openTicket, setOpenTicket] = useState<AdminTicket | null>(null);

  const fetch = async () => {
    setLoading(true);
    const [tRes, oRes] = await Promise.all([
      supabase.from("support_tickets").select("*").order("last_message_at", { ascending: false }),
      supabase.from("organizations").select("id, name"),
    ]);
    const orgs = oRes.data || [];
    const enriched = (tRes.data || []).map((t: any) => ({
      ...t,
      org_name: orgs.find((o: any) => o.id === t.organization_id)?.name || "—",
    }));
    setTickets(enriched as AdminTicket[]);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = tickets.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.org_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    urgent: tickets.filter(t => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length,
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-primary" /> Tickets de support
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counts.open} ouverts · {counts.in_progress} en cours · {counts.urgent} urgents non clôturés
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher (sujet, agence)…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes priorités</SelectItem>
              {Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">Aucun ticket.</CardContent></Card>
        ) : (
          <div className="grid gap-2">
            {filtered.map(t => (
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
            ))}
          </div>
        )}
      </div>

      <TicketDetailSheet
        ticket={openTicket as any}
        onClose={() => { setOpenTicket(null); fetch(); }}
        viewerRole="admin"
      />
    </SuperAdminLayout>
  );
}
