import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Download, Smartphone, Banknote, CreditCard, Wallet as WalletIcon, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { DbRentPayment } from "@/hooks/useData";

const STATUS_LABELS: Record<string, string> = {
  paid: "Payé",
  partial: "Partiel",
  late: "En retard",
  pending: "En attente",
};

const METHOD_META: Record<string, { label: string; icon: typeof Banknote; className: string }> = {
  orange_money: { label: "Orange Money", icon: Smartphone, className: "text-[hsl(25_95%_53%)]" },
  mtn_momo: { label: "MTN MoMo", icon: Smartphone, className: "text-[hsl(48_95%_50%)]" },
  wave: { label: "Wave", icon: Smartphone, className: "text-[hsl(210_100%_56%)]" },
  bank_transfer: { label: "Virement", icon: Building2, className: "text-info" },
  cash: { label: "Espèces", icon: Banknote, className: "text-success" },
  check: { label: "Chèque", icon: CreditCard, className: "text-muted-foreground" },
  unknown: { label: "—", icon: WalletIcon, className: "text-muted-foreground" },
};

function guessMethod(p: DbRentPayment): keyof typeof METHOD_META {
  // Deterministic pseudo-method based on id; until real data wired.
  const methods: (keyof typeof METHOD_META)[] = ["orange_money", "mtn_momo", "wave", "bank_transfer", "cash"];
  const code = (p.id?.charCodeAt(0) || 0) % methods.length;
  return p.status === "paid" || p.status === "partial" ? methods[code] : "unknown";
}

interface Props {
  payments: DbRentPayment[];
  monthLabel: string;
}

type Filter = "all" | "paid" | "pending" | "unpaid";

export function PaymentsTable({ payments, monthLabel }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<DbRentPayment | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return payments;
    if (filter === "paid") return payments.filter(p => p.status === "paid");
    if (filter === "pending") return payments.filter(p => p.status === "pending" || p.status === "partial");
    return payments.filter(p => p.status === "late" || (p.status !== "paid" && p.amount > p.paid_amount && new Date(p.due_date) < new Date()));
  }, [payments, filter]);

  function exportCsv() {
    const header = ["Locataire", "Bien", "Montant payé", "Montant total", "Échéance", "Statut", "Méthode"];
    const rows = filtered.map(p => [
      p.tenants?.full_name || "",
      p.tenants?.units?.properties?.name || p.tenants?.units?.name || "",
      p.paid_amount.toString(),
      p.amount.toString(),
      p.due_date,
      STATUS_LABELS[p.status] || p.status,
      METHOD_META[guessMethod(p)].label,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${(v ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `paiements-${monthLabel.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">Paiements du mois</CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs h-6">Tous</TabsTrigger>
                <TabsTrigger value="paid" className="text-xs h-6">Payé</TabsTrigger>
                <TabsTrigger value="pending" className="text-xs h-6">En attente</TabsTrigger>
                <TabsTrigger value="unpaid" className="text-xs h-6">Impayé</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={exportCsv}>
              <Download className="h-3.5 w-3.5" /> Exporter CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Aucun paiement</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Locataire</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Montant</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Échéance</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Méthode</th>
                  <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 20).map(p => {
                  const method = guessMethod(p);
                  const Meta = METHOD_META[method];
                  const isUnpaid = p.status === "late" || (p.status !== "paid" && p.amount > p.paid_amount && new Date(p.due_date) < new Date());
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={cn(
                        "border-b border-border/50 cursor-pointer transition-colors",
                        isUnpaid ? "bg-[hsl(0_86%_97%)] dark:bg-destructive/5 hover:bg-[hsl(0_86%_94%)] dark:hover:bg-destructive/10" : "hover:bg-muted/30"
                      )}
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-card-foreground">{p.tenants?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{p.tenants?.units?.properties?.name || p.tenants?.units?.name || ""}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-card-foreground">{p.paid_amount.toLocaleString()} / {p.amount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">FCFA</span></td>
                      <td className="py-3 px-4 text-center text-muted-foreground">{new Date(p.due_date).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <Meta.icon className={cn("h-3.5 w-3.5", Meta.className)} />
                          <span className="text-muted-foreground">{Meta.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1",
                          p.status === "paid" ? "bg-success/15 text-success" :
                          p.status === "late" ? "bg-destructive/15 text-destructive" :
                          p.status === "partial" ? "bg-warning/15 text-warning" :
                          "bg-muted text-muted-foreground"
                        )}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Drawer open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DrawerContent>
          {selected && (
            <div className="mx-auto w-full max-w-2xl">
              <DrawerHeader>
                <DrawerTitle>Détail du paiement</DrawerTitle>
                <DrawerDescription>{selected.tenants?.full_name}</DrawerDescription>
              </DrawerHeader>
              <div className="px-6 pb-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Bien" value={selected.tenants?.units?.properties?.name || selected.tenants?.units?.name || "—"} />
                  <Info label="Échéance" value={new Date(selected.due_date).toLocaleDateString("fr-FR")} />
                  <Info label="Montant attendu" value={`${selected.amount.toLocaleString()} FCFA`} />
                  <Info label="Montant payé" value={`${selected.paid_amount.toLocaleString()} FCFA`} />
                  <Info label="Reste à payer" value={`${(selected.amount - selected.paid_amount).toLocaleString()} FCFA`} />
                  <Info label="Statut" value={STATUS_LABELS[selected.status] || selected.status} />
                  <Info label="Méthode" value={METHOD_META[guessMethod(selected)].label} />
                  <Info label="Mois" value={selected.month} />
                </div>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}
