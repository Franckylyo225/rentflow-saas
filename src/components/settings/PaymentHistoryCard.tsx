import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Receipt, Loader2, ExternalLink, Copy, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface PaymentTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  environment: string;
  purpose: string;
  plan_slug: string | null;
  provider: string;
  checkout_url: string | null;
  created_at: string;
  completed_at: string | null;
  billing_cycle: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  processing: { label: "En cours", variant: "secondary" },
  completed: { label: "Réussi", variant: "default" },
  success: { label: "Réussi", variant: "default" },
  failed: { label: "Échoué", variant: "destructive" },
  cancelled: { label: "Annulé", variant: "outline" },
  expired: { label: "Expiré", variant: "outline" },
  refunded: { label: "Remboursé", variant: "outline" },
};

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

export function PaymentHistoryCard() {
  const { profile } = useProfile();
  const organizationId = profile?.organization_id;
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("id, reference, amount, currency, status, environment, purpose, plan_slug, provider, checkout_url, created_at, completed_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error(error);
      }
      setTransactions((data as PaymentTransaction[]) || []);
      setLoading(false);
    })();
  }, [organizationId]);

  const filtered = transactions.filter((t) => {
    const matchSearch = !search ||
      t.reference.toLowerCase().includes(search.toLowerCase()) ||
      (t.plan_slug || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const copyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    toast.success("Référence copiée");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Historique des paiements</CardTitle>
            <CardDescription>Toutes vos transactions de paiement et leur statut</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher par référence ou plan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="completed">Réussi</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
              <SelectItem value="expired">Expiré</SelectItem>
              <SelectItem value="refunded">Remboursé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {transactions.length === 0
                ? "Aucune transaction enregistrée"
                : "Aucune transaction ne correspond aux filtres"}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="h-9 text-xs">Date</TableHead>
                  <TableHead className="h-9 text-xs">Référence</TableHead>
                  <TableHead className="h-9 text-xs">Plan</TableHead>
                  <TableHead className="h-9 text-xs text-right">Montant</TableHead>
                  <TableHead className="h-9 text-xs">Statut</TableHead>
                  <TableHead className="h-9 text-xs w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || { label: t.status, variant: "outline" as const };
                  const isPending = t.status === "pending" || t.status === "processing";
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(t.created_at), "d MMM yyyy, HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono text-foreground">{t.reference}</code>
                          <button
                            type="button"
                            onClick={() => copyReference(t.reference)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copier"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          {t.environment !== "live" && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              {t.environment}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-sm capitalize">
                        {t.plan_slug || t.purpose || "—"}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm font-medium text-right whitespace-nowrap">
                        {formatAmount(t.amount, t.currency)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {isPending && t.checkout_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Reprendre le paiement"
                            onClick={() => window.open(t.checkout_url!, "_blank")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
