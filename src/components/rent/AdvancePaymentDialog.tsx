import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FastForward, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AdvancePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    full_name: string;
    rent: number;
  } | null;
  /** Échéances existantes du locataire (pour calculer le mois de départ et éviter les doublons) */
  existingPayments: Array<{
    id: string;
    month: string;
    due_date: string;
    amount: number;
    paid_amount: number;
    status: string;
  }>;
  /** Jour d'échéance configuré au niveau de l'organisation (1-28). Défaut : 5. */
  rentDueDay?: number;
  /** Méthodes de paiement acceptées par l'organisation. */
  paymentMethods?: string[];
  onCompleted: (paidPaymentIds?: string[]) => void;
}

const MONTH_OPTIONS = [2, 3, 4, 6, 9, 12];

function formatMonthLabel(monthISO: string) {
  const [y, m] = monthISO.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function nextMonthISO(monthISO: string): string {
  const [y, m] = monthISO.split("-").map(Number);
  const d = new Date(y, m, 1); // m is 0-indexed next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dueDateFor(monthISO: string, dueDay: number): string {
  const [y, m] = monthISO.split("-").map(Number);
  const day = Math.max(1, Math.min(28, dueDay || 5));
  const d = new Date(y, m - 1, day);
  return d.toISOString().split("T")[0];
}

export function AdvancePaymentDialog({
  open,
  onOpenChange,
  tenant,
  existingPayments,
  rentDueDay = 5,
  paymentMethods = ["Espèces", "Virement bancaire", "Chèque", "Mobile Money"],
  onCompleted,
}: AdvancePaymentDialogProps) {
  const [monthsCount, setMonthsCount] = useState<number>(2);
  const [customMonths, setCustomMonths] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<string>(paymentMethods[0] || "Espèces");
  const [comment, setComment] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Détermine le mois de départ : 1ère échéance non payée (>= mois courant) OU mois suivant la dernière échéance
  const startMonth = useMemo(() => {
    const current = todayMonthISO();
    const unpaid = existingPayments
      .filter(p => p.status !== "paid" && p.month >= current)
      .map(p => p.month)
      .sort();
    if (unpaid.length > 0) return unpaid[0];

    const allMonths = existingPayments.map(p => p.month).sort();
    if (allMonths.length === 0) return current;
    const last = allMonths[allMonths.length - 1];
    return last >= current ? nextMonthISO(last) : current;
  }, [existingPayments]);

  const effectiveMonths = useMemo(() => {
    const n = customMonths ? parseInt(customMonths, 10) : monthsCount;
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 60) : 0;
  }, [monthsCount, customMonths]);

  // Liste des mois couverts à partir de startMonth
  const coveredMonths = useMemo(() => {
    const list: string[] = [];
    let cursor = startMonth;
    for (let i = 0; i < effectiveMonths; i++) {
      list.push(cursor);
      cursor = nextMonthISO(cursor);
    }
    return list;
  }, [startMonth, effectiveMonths]);

  const expectedTotal = useMemo(
    () => (tenant?.rent || 0) * effectiveMonths,
    [tenant, effectiveMonths]
  );

  // Réinitialise le formulaire à l'ouverture
  useEffect(() => {
    if (open) {
      setMonthsCount(2);
      setCustomMonths("");
      setAmount(String(expectedTotal || ""));
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setMethod(paymentMethods[0] || "Espèces");
      setComment("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Met à jour le montant pré-rempli quand le nb de mois change (sauf si l'utilisateur l'a modifié manuellement à 0/vide)
  useEffect(() => {
    setAmount(String(expectedTotal || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMonths, tenant?.id]);

  const handleSubmit = async () => {
    if (!tenant) return;
    const totalAmount = parseInt(amount, 10);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (effectiveMonths < 2) {
      toast.error("Sélectionnez au moins 2 mois");
      return;
    }
    if (!tenant.rent || tenant.rent <= 0) {
      toast.error("Le loyer du locataire n'est pas défini");
      return;
    }

    setSaving(true);
    const fullyPaidIds: string[] = [];
    try {
      // 1) Pour chaque mois couvert, soit on récupère l'échéance existante, soit on la crée
      const existingByMonth = new Map(existingPayments.map(p => [p.month, p]));
      const paymentIds: string[] = [];

      for (const monthISO of coveredMonths) {
        let pid = existingByMonth.get(monthISO)?.id;
        if (!pid) {
          const { data: created, error } = await supabase
            .from("rent_payments")
            .insert({
              tenant_id: tenant.id,
              amount: tenant.rent,
              paid_amount: 0,
              due_date: dueDateFor(monthISO, rentDueDay),
              month: monthISO,
              status: "pending",
            })
            .select("id")
            .single();
          if (error) throw error;
          pid = created!.id;
        }
        paymentIds.push(pid!);
      }

      // 2) Répartition séquentielle du montant total : on remplit chaque échéance jusqu'à concurrence du loyer
      let remaining = totalAmount;
      for (let i = 0; i < paymentIds.length; i++) {
        const pid = paymentIds[i];
        // Récupère le paid_amount actuel
        const existing = existingByMonth.get(coveredMonths[i]);
        const alreadyPaid = existing?.paid_amount ?? 0;
        const monthAmount = existing?.amount ?? tenant.rent;
        const due = Math.max(0, monthAmount - alreadyPaid);
        if (due <= 0 || remaining <= 0) continue;

        const apply = Math.min(remaining, due);
        const newPaid = alreadyPaid + apply;
        const wasNotPaidBefore = (existing?.status ?? "pending") !== "paid";
        const newStatus = newPaid >= monthAmount ? "paid" : "partial";
        if (newStatus === "paid" && wasNotPaidBefore) fullyPaidIds.push(pid);

        // Insert payment record
        const { error: prErr } = await supabase.from("payment_records").insert({
          rent_payment_id: pid,
          amount: apply,
          payment_date: paymentDate,
          method,
          comment: comment || `Paiement anticipé ${i + 1}/${paymentIds.length} — ${formatMonthLabel(coveredMonths[i])}`,
        });
        if (prErr) throw prErr;

        const { error: upErr } = await supabase
          .from("rent_payments")
          .update({ paid_amount: newPaid, status: newStatus })
          .eq("id", pid);
        if (upErr) throw upErr;

        remaining -= apply;
      }

      toast.success(
        `Paiement anticipé enregistré sur ${coveredMonths.length} mois${remaining > 0 ? ` (reliquat non affecté : ${remaining.toLocaleString()} FCFA)` : ""}`
      );
      onOpenChange(false);
      onCompleted(fullyPaidIds);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FastForward className="h-5 w-5 text-primary" />
            Paiement anticipé
          </DialogTitle>
          <DialogDescription>
            {tenant.full_name} — Loyer mensuel : {tenant.rent.toLocaleString()} FCFA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nombre de mois à couvrir</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
              {MONTH_OPTIONS.map(n => (
                <Button
                  key={n}
                  type="button"
                  variant={!customMonths && monthsCount === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setMonthsCount(n); setCustomMonths(""); }}
                >
                  {n} mois
                </Button>
              ))}
            </div>
            <div className="mt-2">
              <Label className="text-xs text-muted-foreground">Ou saisir un nombre personnalisé</Label>
              <Input
                type="number"
                min={2}
                max={60}
                placeholder="ex: 5"
                value={customMonths}
                onChange={e => setCustomMonths(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {effectiveMonths >= 1 && (
            <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                Période couverte
              </div>
              <p className="text-xs text-muted-foreground">
                Du <span className="font-medium text-foreground capitalize">{formatMonthLabel(coveredMonths[0])}</span>{" "}
                au <span className="font-medium text-foreground capitalize">{formatMonthLabel(coveredMonths[coveredMonths.length - 1])}</span>
                {" "}({coveredMonths.length} mois)
              </p>
              <p className="text-xs text-muted-foreground">
                Total attendu : <span className="font-semibold text-foreground">{expectedTotal.toLocaleString()} FCFA</span>
              </p>
            </div>
          )}

          <div>
            <Label>Montant payé (FCFA)</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={String(expectedTotal)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Pré-rempli automatiquement, modifiable. Si différent du total attendu, la dernière échéance sera marquée comme partielle.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date de paiement</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <Label>Mode de paiement</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Commentaire (optionnel)</Label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Référence virement, n° chèque…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving || effectiveMonths < 2}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enregistrer le paiement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
