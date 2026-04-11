import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, ArrowRight, ArrowLeft, Check, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContractEditor } from "@/components/contracts/ContractEditor";

interface ContractWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: any;
  organizationSettings: any;
  onComplete: () => void;
}

function replaceVariables(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
  }
  return result;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function ContractWizard({ open, onOpenChange, tenant, organizationSettings, onComplete }: ContractWizardProps) {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [filledContent, setFilledContent] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [generateSchedule, setGenerateSchedule] = useState(true);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedTemplate(null);
      setFilledContent("");
      setEditedContent("");
      setGenerateSchedule(true);
      fetchTemplates();
    }
  }, [open]);

  async function fetchTemplates() {
    setLoadingTemplates(true);
    const { data } = await supabase
      .from("contract_templates")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    setTemplates(data || []);
    setLoadingTemplates(false);
  }

  function buildVariables(): Record<string, string> {
    const org = organizationSettings;
    const leaseEnd = new Date(tenant.lease_start);
    leaseEnd.setMonth(leaseEnd.getMonth() + tenant.lease_duration);

    return {
      "{{tenant_name}}": tenant.tenant_type === "company"
        ? (tenant.company_name || tenant.full_name)
        : tenant.full_name,
      "{{tenant_phone}}": tenant.phone || "",
      "{{property_name}}": tenant.units?.properties?.name || "",
      "{{unit_name}}": tenant.units?.name || "",
      "{{rent_amount}}": tenant.rent?.toLocaleString("fr-FR") || "0",
      "{{start_date}}": formatDate(tenant.lease_start),
      "{{end_date}}": formatDate(leaseEnd.toISOString()),
      "{{agency_name}}": org?.legal_name || org?.name || "",
    };
  }

  function goToStep2() {
    if (!selectedTemplate) return;
    const vars = buildVariables();
    const filled = replaceVariables(selectedTemplate.content, vars);
    setFilledContent(filled);
    setEditedContent(filled);
    setStep(2);
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from("contracts").insert({
      tenant_id: tenant.id,
      template_id: selectedTemplate?.id || null,
      content: editedContent,
      status: "draft",
    });

    if (error) {
      toast.error("Erreur : " + error.message);
      setSaving(false);
      return;
    }

    // Auto-generate rent schedule if opted in
    if (generateSchedule) {
      await generateRentSchedule();
    }

    toast.success("Contrat créé avec succès");
    onComplete();
    onOpenChange(false);
    setSaving(false);
  }

  async function generateRentSchedule() {
    // Check existing payments to avoid duplicates
    const { data: existing } = await supabase
      .from("rent_payments")
      .select("month")
      .eq("tenant_id", tenant.id);

    const existingMonths = new Set((existing || []).map((p: any) => p.month));

    const leaseStart = new Date(tenant.lease_start);
    const rentDueDay = organizationSettings?.rent_due_day || 5;
    const payments: any[] = [];

    for (let i = 0; i < tenant.lease_duration; i++) {
      const date = new Date(leaseStart);
      date.setMonth(date.getMonth() + i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (existingMonths.has(monthKey)) continue;

      const dueDate = new Date(date.getFullYear(), date.getMonth(), rentDueDay);
      const isAdvance = i < (tenant.advance_months || 0);

      payments.push({
        tenant_id: tenant.id,
        month: monthKey,
        amount: tenant.rent,
        due_date: dueDate.toISOString().split("T")[0],
        status: isAdvance ? "paid" : "pending",
        paid_amount: isAdvance ? tenant.rent : 0,
      });
    }

    if (payments.length > 0) {
      const { error } = await supabase.from("rent_payments").insert(payments);
      if (error) {
        toast.error("Échéancier: " + error.message);
      } else {
        toast.success(`${payments.length} échéances générées`);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            Créer un contrat de bail
          </DialogTitle>
          {/* Stepper */}
          <div className="flex items-center gap-2 pt-3">
            {[
              { n: 1, label: "Modèle" },
              { n: 2, label: "Aperçu" },
              { n: 3, label: "Éditeur" },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                {i > 0 && <div className={`w-8 h-px ${step >= s.n ? "bg-primary" : "bg-border"}`} />}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${
                  step === s.n ? "text-primary" : step > s.n ? "text-muted-foreground" : "text-muted-foreground/50"
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    step > s.n ? "bg-primary text-primary-foreground" : step === s.n ? "bg-primary/10 text-primary border border-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {step > s.n ? <Check className="h-3 w-3" /> : s.n}
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Step 1: Select template */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            {loadingTemplates ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                Aucun modèle disponible. Créez-en un dans Paramètres → Modèles de contrats.
              </p>
            ) : (
              templates.map((t) => (
                <Card
                  key={t.id}
                  className={`p-4 cursor-pointer transition-all border-2 ${
                    selectedTemplate?.id === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedTemplate(t)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className={`h-5 w-5 ${selectedTemplate?.id === t.id ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-medium text-sm">{t.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {t.template_type === "individual" ? "Personne physique" : "Entreprise"}
                          </Badge>
                          {t.is_default && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Par défaut</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedTemplate?.id === t.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                      {selectedTemplate?.id === t.id && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Step 2: Preview with filled variables */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Eye className="h-4 w-4 shrink-0" />
              <span>Les variables ont été remplacées par les données du locataire. Vérifiez les informations avant de passer à l'éditeur.</span>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none p-6 border border-border rounded-lg bg-card max-h-[50vh] overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: filledContent }} />
            </div>
          </div>
        )}

        {/* Step 3: Editor */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <ContractEditor
              content={editedContent}
              onChange={setEditedContent}
            />
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
              <Checkbox
                id="generate-schedule"
                checked={generateSchedule}
                onCheckedChange={(v) => setGenerateSchedule(!!v)}
              />
              <Label htmlFor="generate-schedule" className="text-sm cursor-pointer">
                Générer automatiquement l'échéancier de loyer ({tenant.lease_duration} mois × {tenant.rent?.toLocaleString()} FCFA)
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            {step === 1 && (
              <Button onClick={goToStep2} disabled={!selectedTemplate}>
                Suivant
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => setStep(3)}>
                Personnaliser
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                <Check className="h-4 w-4 mr-1" />
                Enregistrer le contrat
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
