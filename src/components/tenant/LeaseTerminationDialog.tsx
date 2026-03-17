import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, AlertTriangle, CheckCircle2, Loader2, ClipboardCheck, Wrench, Circle } from "lucide-react";
import { format, addMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const REASONS = [
  { value: "normal", label: "Fin de bail normale (à échéance)" },
  { value: "anticipee_locataire", label: "Résiliation anticipée par locataire" },
  { value: "anticipee_proprietaire", label: "Résiliation par propriétaire" },
  { value: "impaye", label: "Départ pour impayé / contentieux" },
] as const;

const NOTICE_DURATIONS = [
  { value: 1, label: "1 mois" },
  { value: 2, label: "2 mois" },
  { value: 3, label: "3 mois" },
  { value: 6, label: "6 mois" },
];

interface InspectionItem {
  id: string;
  label: string;
  category: string;
  checked: boolean;
  status: "bon" | "usure" | "degrade" | "";
  repairCost: number;
  comment: string;
}

const DEFAULT_INSPECTION_ITEMS: Omit<InspectionItem, "checked" | "status" | "repairCost" | "comment">[] = [
  { id: "murs", label: "Murs et peintures", category: "Intérieur" },
  { id: "sols", label: "Sols et revêtements", category: "Intérieur" },
  { id: "plafonds", label: "Plafonds", category: "Intérieur" },
  { id: "portes", label: "Portes et serrures", category: "Intérieur" },
  { id: "fenetres", label: "Fenêtres et vitres", category: "Intérieur" },
  { id: "electricite", label: "Installation électrique", category: "Équipements" },
  { id: "plomberie", label: "Plomberie et robinetterie", category: "Équipements" },
  { id: "sanitaires", label: "Sanitaires (WC, douche, lavabo)", category: "Équipements" },
  { id: "cuisine", label: "Cuisine (évier, plan de travail)", category: "Équipements" },
  { id: "climatisation", label: "Climatisation / Ventilation", category: "Équipements" },
  { id: "exterieur", label: "Terrasse / Balcon / Jardin", category: "Extérieur" },
  { id: "clotures", label: "Clôtures et portails", category: "Extérieur" },
  { id: "cles", label: "Remise des clés", category: "Général" },
  { id: "compteurs", label: "Relevé des compteurs (eau/élec)", category: "Général" },
  { id: "proprete", label: "Propreté générale", category: "Général" },
];

const STATUS_OPTIONS = [
  { value: "bon", label: "Bon état", color: "text-emerald-600" },
  { value: "usure", label: "Usure normale", color: "text-amber-600" },
  { value: "degrade", label: "Dégradé", color: "text-destructive" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: any;
  payments: any[];
  onComplete: () => void;
}

export function LeaseTerminationDialog({ open, onOpenChange, tenant, payments, onComplete }: Props) {
  const [step, setStep] = useState<"init" | "inspection" | "summary" | "confirm">("init");
  const [reason, setReason] = useState("");
  const [notificationDate, setNotificationDate] = useState<Date | undefined>(new Date());
  const [noticeDuration, setNoticeDuration] = useState("1");
  const [saving, setSaving] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");

  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>(
    DEFAULT_INSPECTION_ITEMS.map(item => ({
      ...item,
      checked: false,
      status: "" as const,
      repairCost: 0,
      comment: "",
    }))
  );

  const totalRepairCost = useMemo(
    () => inspectionItems.reduce((sum, item) => sum + item.repairCost, 0),
    [inspectionItems]
  );

  const inspectionComplete = useMemo(
    () => inspectionItems.every(item => item.checked && item.status),
    [inspectionItems]
  );

  const effectiveDate = useMemo(() => {
    if (!notificationDate) return null;
    return addMonths(notificationDate, parseInt(noticeDuration));
  }, [notificationDate, noticeDuration]);

  const financialSummary = useMemo(() => {
    if (!effectiveDate) return null;

    const remainingRentDue = payments
      .filter(p => p.status !== "paid")
      .reduce((sum: number, p: any) => sum + (p.amount - p.paid_amount), 0);

    const depositAmount = tenant.deposit;
    const totalDue = remainingRentDue + totalRepairCost;
    const balance = depositAmount - totalDue;

    return {
      remainingRentDue,
      repairCost: totalRepairCost,
      pendingCharges: totalRepairCost,
      penalties: 0,
      depositAmount,
      totalDue: Math.max(0, totalDue),
      depositRetained: Math.max(0, Math.min(depositAmount, totalDue)),
      balance,
    };
  }, [effectiveDate, payments, tenant, totalRepairCost]);

  const canProceed = reason && notificationDate && noticeDuration;

  const updateItem = (id: string, updates: Partial<InspectionItem>) => {
    setInspectionItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const buildInspectionNotes = () => {
    const lines: string[] = [];
    const categories = [...new Set(inspectionItems.map(i => i.category))];
    for (const cat of categories) {
      lines.push(`\n=== ${cat} ===`);
      for (const item of inspectionItems.filter(i => i.category === cat)) {
        const statusLabel = STATUS_OPTIONS.find(s => s.value === item.status)?.label || "";
        lines.push(`• ${item.label}: ${statusLabel}${item.repairCost > 0 ? ` — Réparation: ${item.repairCost.toLocaleString()} FCFA` : ""}`);
        if (item.comment) lines.push(`  → ${item.comment}`);
      }
    }
    if (generalNotes) lines.push(`\n=== Observations générales ===\n${generalNotes}`);
    return lines.join("\n");
  };

  const handleNext = () => {
    if (step === "init" && canProceed) setStep("inspection");
    else if (step === "inspection") setStep("summary");
    else if (step === "summary") setStep("confirm");
  };

  const handleClose = async () => {
    if (!effectiveDate || !financialSummary || !notificationDate) return;
    setSaving(true);
    try {
      const { error: termError } = await supabase.from("bail_terminations").insert({
        tenant_id: tenant.id,
        reason,
        notification_date: format(notificationDate, "yyyy-MM-dd"),
        notice_duration: parseInt(noticeDuration),
        effective_date: format(effectiveDate, "yyyy-MM-dd"),
        remaining_rent_due: financialSummary.remainingRentDue,
        pending_charges: financialSummary.pendingCharges,
        penalties: financialSummary.penalties,
        deposit_amount: financialSummary.depositAmount,
        prorata_adjustment: 0,
        total_due: financialSummary.totalDue,
        deposit_retained: financialSummary.depositRetained,
        balance: financialSummary.balance,
        inspection_notes: buildInspectionNotes(),
        inspection_status: inspectionComplete ? "completed" : "partial",
        status: "closed",
        closed_at: new Date().toISOString(),
      });
      if (termError) throw termError;

      const { error: tenantError } = await supabase.from("tenants").update({ is_active: false }).eq("id", tenant.id);
      if (tenantError) throw tenantError;

      const { error: unitError } = await supabase.from("units").update({ status: "vacant" as const }).eq("id", tenant.unit_id);
      if (unitError) throw unitError;

      toast({ title: "Bail clôturé", description: `Le bail de ${tenant.full_name} a été clôturé avec succès.` });
      onOpenChange(false);
      onComplete();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep("init");
    setReason("");
    setNotificationDate(new Date());
    setNoticeDuration("1");
    setGeneralNotes("");
    setInspectionItems(
      DEFAULT_INSPECTION_ITEMS.map(item => ({
        ...item,
        checked: false,
        status: "" as const,
        repairCost: 0,
        comment: "",
      }))
    );
  };

  const categories = [...new Set(inspectionItems.map(i => i.category))];
  const degradedCount = inspectionItems.filter(i => i.status === "degrade").length;
  const checkedCount = inspectionItems.filter(i => i.checked && i.status).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Fin de bail — {tenant.full_name}
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1 pt-2">
            {(["init", "inspection", "summary", "confirm"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={cn(
                  "h-2 w-2 rounded-full transition-colors",
                  step === s ? "bg-primary" : (["init", "inspection", "summary", "confirm"].indexOf(step) > i ? "bg-primary/50" : "bg-muted-foreground/20")
                )} />
                {i < 3 && <div className="w-6 h-px bg-border" />}
              </div>
            ))}
            <span className="text-xs text-muted-foreground ml-2">
              {step === "init" ? "Informations" : step === "inspection" ? "État des lieux" : step === "summary" ? "Solde" : "Confirmation"}
            </span>
          </div>
        </DialogHeader>

        {/* STEP 1: Init */}
        {step === "init" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Motif de départ *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Choisir le motif..." /></SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date de notification *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !notificationDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {notificationDate ? format(notificationDate, "PPP", { locale: fr }) : "Sélectionner..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={notificationDate} onSelect={setNotificationDate} className="p-3 pointer-events-auto" locale={fr} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Durée du préavis *</Label>
              <Select value={noticeDuration} onValueChange={setNoticeDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NOTICE_DURATIONS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {effectiveDate && (
              <Card className="bg-muted/50 border-border">
                <CardContent className="py-3 px-4">
                  <p className="text-sm text-muted-foreground">Le bail prendra fin le</p>
                  <p className="text-lg font-semibold text-foreground">{format(effectiveDate, "dd MMMM yyyy", { locale: fr })}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Dernier loyer dû : {format(startOfMonth(effectiveDate), "MMMM yyyy", { locale: fr })}
                  </p>
                </CardContent>
              </Card>
            )}

            <Button className="w-full" disabled={!canProceed} onClick={handleNext}>
              Suivant — État des lieux
            </Button>
          </div>
        )}

        {/* STEP 2: Inspection / État des lieux */}
        {step === "inspection" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm text-foreground">État des lieux de sortie</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{checkedCount}/{inspectionItems.length} vérifié(s)</span>
                {degradedCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{degradedCount} dégradé(s)</Badge>
                )}
              </div>
            </div>

            {categories.map(category => (
              <div key={category} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h4>
                <div className="space-y-1">
                  {inspectionItems
                    .filter(item => item.category === category)
                    .map(item => (
                      <InspectionRow key={item.id} item={item} onUpdate={updateItem} />
                    ))}
                </div>
              </div>
            ))}

            {/* Total repair cost banner */}
            {totalRepairCost > 0 && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-foreground">Total réparations</span>
                  </div>
                  <span className="font-bold text-destructive">{totalRepairCost.toLocaleString()} FCFA</span>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Observations générales</Label>
              <Textarea
                value={generalNotes}
                onChange={e => setGeneralNotes(e.target.value)}
                placeholder="Remarques complémentaires sur l'état du logement..."
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("init")}>Retour</Button>
              <Button className="flex-1" onClick={handleNext} disabled={!inspectionComplete}>
                {inspectionComplete ? "Calculer le solde" : `${inspectionItems.length - checkedCount} élément(s) restant(s)`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Summary */}
        {step === "summary" && financialSummary && (
          <div className="space-y-5">
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Solde locataire</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loyers restants dus</span>
                  <span className="font-medium text-foreground">{financialSummary.remainingRentDue.toLocaleString()} FCFA</span>
                </div>
                {financialSummary.repairCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coût des réparations</span>
                    <span className="font-medium text-foreground">{financialSummary.repairCost.toLocaleString()} FCFA</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total dû</span>
                  <span className="font-semibold text-foreground">{financialSummary.totalDue.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dépôt de garantie</span>
                  <span className="font-medium text-foreground">{financialSummary.depositAmount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dépôt retenu</span>
                  <span className="font-medium text-destructive">{financialSummary.depositRetained.toLocaleString()} FCFA</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  {financialSummary.balance >= 0 ? (
                    <>
                      <span className="font-semibold text-foreground">Solde à restituer</span>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600 text-base px-3">
                        {financialSummary.balance.toLocaleString()} FCFA
                      </Badge>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">Solde à payer</span>
                      <Badge variant="destructive" className="text-base px-3">
                        {Math.abs(financialSummary.balance).toLocaleString()} FCFA
                      </Badge>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inspection recap */}
            {degradedCount > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" /> Réparations identifiées
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {inspectionItems
                    .filter(i => i.status === "degrade" && i.repairCost > 0)
                    .map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-foreground">{item.repairCost.toLocaleString()} FCFA</span>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("inspection")}>Retour</Button>
              <Button className="flex-1" onClick={handleNext}>Clôturer le bail</Button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm */}
        {step === "confirm" && (
          <div className="space-y-5">
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Confirmer la clôture du bail</p>
                    <p className="text-sm text-muted-foreground mt-1">Cette action est irréversible. Le bail sera clôturé, le locataire passera en "Ancien locataire" et l'unité sera libérée.</p>
                  </div>
                </div>

                <div className="text-sm space-y-1 pl-7">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> État des lieux complété</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> Bail clôturé</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> Unité → Vacant</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> Locataire → Ancien locataire</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /> Historique conservé</div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep("summary")}>Retour</Button>
              <Button variant="destructive" className="flex-1" onClick={handleClose} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmer la clôture
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Inspection Row Component ─── */
function InspectionRow({ item, onUpdate }: { item: InspectionItem; onUpdate: (id: string, updates: Partial<InspectionItem>) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "rounded-lg border border-border transition-colors",
      item.status === "degrade" && "border-destructive/30 bg-destructive/5",
      item.status === "bon" && "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-900/10",
      item.status === "usure" && "border-amber-200 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-900/10",
    )}>
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Checkbox
          checked={item.checked && !!item.status}
          onCheckedChange={() => {}}
          className="pointer-events-none"
        />
        <span className="text-sm font-medium text-foreground flex-1">{item.label}</span>

        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onUpdate(item.id, { status: opt.value as any, checked: true })}
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium border transition-all",
                item.status === opt.value
                  ? opt.value === "bon"
                    ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-400"
                    : opt.value === "usure"
                    ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-400"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                  : "bg-transparent border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border">
          {item.status === "degrade" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Coût de réparation (FCFA)</Label>
              <Input
                type="number"
                min={0}
                value={item.repairCost || ""}
                onChange={e => onUpdate(item.id, { repairCost: Number(e.target.value) || 0 })}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Commentaire</Label>
            <Input
              value={item.comment}
              onChange={e => onUpdate(item.id, { comment: e.target.value })}
              placeholder="Détails..."
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
