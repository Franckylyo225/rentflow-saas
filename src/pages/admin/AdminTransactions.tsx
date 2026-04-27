import { useEffect, useState } from "react";
import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Transaction {
  id: string;
  organization_id: string;
  org_name: string;
  event_type: string;
  previous_plan: string | null;
  new_plan: string | null;
  amount: number | null;
  notes: string | null;
  created_at: string;
  billing_cycle: string | null;
}

const EVENT_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof ArrowUpRight }> = {
  trial_start: { label: "Début d'essai", variant: "secondary", icon: ArrowUpRight },
  plan_change: { label: "Changement de plan", variant: "default", icon: TrendingUp },
  status_change: { label: "Changement de statut", variant: "outline", icon: ArrowDownRight },
  payment: { label: "Paiement", variant: "default", icon: DollarSign },
  renewal: { label: "Renouvellement", variant: "default", icon: TrendingUp },
};

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCycle, setFilterCycle] = useState("all");

  useEffect(() => {
    async function fetchData() {
      const [histRes, orgsRes, paysRes] = await Promise.all([
        supabase.from("subscription_history").select("*").order("created_at", { ascending: false }),
        supabase.from("organizations").select("id, name"),
        supabase
          .from("payment_transactions")
          .select("organization_id, billing_cycle, created_at, completed_at, status")
          .in("status", ["completed", "success"])
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      const orgs = orgsRes.data || [];
      const pays = (paysRes.data || []) as any[];

      const findCycle = (orgId: string, ts: string): string | null => {
        const t = new Date(ts).getTime();
        let best: { diff: number; cycle: string | null } | null = null;
        for (const p of pays) {
          if (p.organization_id !== orgId || !p.billing_cycle) continue;
          const pt = new Date(p.completed_at || p.created_at).getTime();
          const diff = Math.abs(pt - t);
          // Within a 30-min window, take the closest match
          if (diff <= 30 * 60 * 1000 && (!best || diff < best.diff)) {
            best = { diff, cycle: p.billing_cycle };
          }
        }
        return best?.cycle ?? null;
      };

      const enriched: Transaction[] = (histRes.data || []).map((t: any) => ({
        ...t,
        org_name: orgs.find((o: any) => o.id === t.organization_id)?.name || "—",
        billing_cycle:
          t.event_type === "payment" || t.event_type === "renewal" || t.event_type === "plan_change"
            ? findCycle(t.organization_id, t.created_at)
            : null,
      }));

      setTransactions(enriched);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = transactions.filter((t) => {
    const matchSearch = t.org_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.notes || "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.event_type === filterType;
    const matchCycle =
      filterCycle === "all" ||
      (filterCycle === "none" ? !t.billing_cycle : t.billing_cycle === filterCycle);
    return matchSearch && matchType && matchCycle;
  });

  const totalPayments = transactions
    .filter((t) => t.amount && t.amount > 0)
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const thisMonth = transactions.filter((t) => {
    const d = new Date(t.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const planChanges = transactions.filter((t) => t.event_type === "plan_change").length;

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historique des transactions et paiements d'abonnements
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{transactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Revenus enregistrés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalPayments.toLocaleString("fr-FR")} FCFA</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Ce mois</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{thisMonth.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Changements de plan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{planChanges}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par organisation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="trial_start">Début d'essai</SelectItem>
              <SelectItem value="plan_change">Changement de plan</SelectItem>
              <SelectItem value="status_change">Changement de statut</SelectItem>
              <SelectItem value="payment">Paiement</SelectItem>
              <SelectItem value="renewal">Renouvellement</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCycle} onValueChange={setFilterCycle}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les cycles</SelectItem>
              <SelectItem value="monthly">Mensuel</SelectItem>
              <SelectItem value="yearly">Annuel</SelectItem>
              <SelectItem value="none">Sans cycle</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Détails</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucune transaction trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((t) => {
                      const cfg = EVENT_CONFIG[t.event_type] || {
                        label: t.event_type,
                        variant: "outline" as const,
                        icon: ArrowUpRight,
                      };
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(t.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                          </TableCell>
                          <TableCell className="font-medium">{t.org_name}</TableCell>
                          <TableCell>
                            <Badge variant={cfg.variant}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.previous_plan && t.new_plan ? (
                              <span>
                                <span className="text-muted-foreground">{t.previous_plan}</span>
                                {" → "}
                                <span className="font-medium text-foreground">{t.new_plan}</span>
                              </span>
                            ) : t.new_plan ? (
                              <span className="font-medium">{t.new_plan}</span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {t.amount ? `${t.amount.toLocaleString("fr-FR")} FCFA` : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {t.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminTransactions;
