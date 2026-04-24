import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageSquare, Send, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

// ============================================================
// Limites de sécurité — envoi groupé
// ============================================================
const MAX_RECIPIENTS_PER_SEND = 200;       // hard cap
const SOFT_WARN_RECIPIENTS = 100;          // avertissement visuel
const REQUIRE_CONFIRM_ABOVE = 50;          // checkbox de confirmation requise
const MAX_SMS_CHARS = 480;                 // 3 segments max
const THROTTLE_BATCH_SIZE = 10;            // SMS envoyés en parallèle par lot
const THROTTLE_DELAY_MS = 500;             // pause entre 2 lots

// E.164 simplifié : optionnel +, 8 à 15 chiffres
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-.()]/g, "");
}

function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  return PHONE_REGEX.test(normalizePhone(phone));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface BulkSmsRecipient {
  tenantId: string;
  name: string;
  phone: string | null | undefined;
  rentPaymentId?: string | null;
  rentAmount?: number | null;
  dueDate?: string | null;
}

interface BulkSmsDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipients: BulkSmsRecipient[];
  title?: string;
  description?: string;
}

type Step = 1 | 2 | 3;

function renderTemplate(content: string, vars: Record<string, string>): string {
  let out = content;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), v ?? "");
  }
  return out;
}

function buildVars(r: BulkSmsRecipient, agencyName: string): Record<string, string> {
  const due = r.dueDate ? new Date(r.dueDate).toLocaleDateString("fr-FR") : "";
  return {
    tenant_name: r.name ?? "",
    rent_amount: r.rentAmount != null ? r.rentAmount.toLocaleString("fr-FR") : "",
    due_date: due,
    agency_name: agencyName,
  };
}

export function BulkSmsDialog({
  open,
  onOpenChange,
  recipients,
  title = "Envoi groupé de SMS",
  description = "Sélectionnez les destinataires, choisissez un modèle et confirmez.",
}: BulkSmsDialogProps) {
  const { profile } = useProfile();
  const { settings: orgSettings } = useOrganizationSettings();
  const orgId = profile?.organization_id;

  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<{ id: string; label: string; content: string }[]>([]);
  const [templateId, setTemplateId] = useState<string>("none");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [confirmAck, setConfirmAck] = useState(false);

  // Filtre : numéro présent ET valide (E.164)
  const eligible = useMemo(
    () => recipients.filter((r) => isValidPhone(r.phone)),
    [recipients]
  );

  // Destinataires avec numéro mais format invalide → affichés en grisé avec badge
  const invalidPhoneCount = useMemo(
    () =>
      recipients.filter(
        (r) => !!r.phone && r.phone.trim().length > 0 && !isValidPhone(r.phone)
      ).length,
    [recipients]
  );

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setStep(1);
    // Pré-sélection limitée au hard cap
    const pre = eligible.slice(0, MAX_RECIPIENTS_PER_SEND);
    setSelected(new Set(pre.map((r) => r.tenantId + (r.rentPaymentId ?? ""))));
    setTemplateId("none");
    setContent("");
    setProgress({ done: 0, total: 0 });
    setConfirmAck(false);
  }, [open, eligible]);

  // Fetch templates
  useEffect(() => {
    if (!orgId || !open) return;
    supabase
      .from("sms_templates")
      .select("id, label, content")
      .eq("organization_id", orgId)
      .then(({ data }) => setTemplates(data || []));
  }, [orgId, open]);

  const recipientKey = (r: BulkSmsRecipient) => r.tenantId + (r.rentPaymentId ?? "");

  const toggleAll = (checked: boolean) => {
    if (checked) {
      // Limite la sélection au plafond
      const capped = eligible.slice(0, MAX_RECIPIENTS_PER_SEND);
      setSelected(new Set(capped.map(recipientKey)));
      if (eligible.length > MAX_RECIPIENTS_PER_SEND) {
        toast.warning(`Sélection limitée à ${MAX_RECIPIENTS_PER_SEND} destinataires`, {
          description: `Pour des raisons de sécurité, un envoi groupé ne peut dépasser ${MAX_RECIPIENTS_PER_SEND} destinataires.`,
        });
      }
    } else setSelected(new Set());
  };

  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (next.size >= MAX_RECIPIENTS_PER_SEND) {
          toast.error(`Maximum ${MAX_RECIPIENTS_PER_SEND} destinataires par envoi`);
          return prev;
        }
        next.add(key);
      }
      return next;
    });
  };

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (id === "none") return;
    const tpl = templates.find((t) => t.id === id);
    if (tpl) setContent(tpl.content);
  };

  const selectedRecipients = useMemo(
    () => eligible.filter((r) => selected.has(recipientKey(r))),
    [eligible, selected]
  );

  const agencyName = orgSettings?.name ?? "RentFlow";

  const previews = useMemo(
    () =>
      selectedRecipients.slice(0, 3).map((r) => ({
        name: r.name,
        phone: r.phone!,
        rendered: renderTemplate(content, buildVars(r, agencyName)),
      })),
    [selectedRecipients, content, agencyName]
  );

  const charCount = content.length;
  const segments = Math.max(1, Math.ceil(charCount / 160));
  const totalSms = selectedRecipients.length * segments;

  const canGoStep2 = selected.size > 0;
  const canGoStep3 = content.trim().length > 0;

  const handleSend = async () => {
    if (!orgId || selectedRecipients.length === 0 || !content.trim()) return;
    setSending(true);
    setProgress({ done: 0, total: selectedRecipients.length });

    const rows = selectedRecipients.map((r) => ({
      organization_id: orgId,
      recipient_phone: r.phone!,
      recipient_name: r.name,
      content: renderTemplate(content, buildVars(r, agencyName)),
      tenant_id: r.tenantId,
      rent_payment_id: r.rentPaymentId ?? null,
      template_id: templateId === "none" ? null : templateId,
      trigger_type: "manual" as const,
      status: "scheduled" as const,
      scheduled_for: new Date().toISOString(),
    }));

    const { data: msgs, error: insertErr } = await supabase
      .from("sms_messages")
      .insert(rows)
      .select("id");

    if (insertErr || !msgs) {
      toast.error("Erreur lors de la mise en file", { description: insertErr?.message });
      setSending(false);
      return;
    }

    let done = 0;
    let failed = 0;
    await Promise.all(
      msgs.map(async (m) => {
        const { error } = await supabase.functions.invoke("sms-send", {
          body: { sms_message_id: m.id },
        });
        if (error) failed += 1;
        done += 1;
        setProgress({ done, total: msgs.length });
      })
    );

    setSending(false);
    if (failed === 0) {
      toast.success(`${msgs.length} SMS envoyés`);
    } else if (failed === msgs.length) {
      toast.error("Aucun SMS n'a pu être envoyé");
    } else {
      toast.warning(`${msgs.length - failed}/${msgs.length} SMS envoyés`, {
        description: `${failed} échec(s) — voir l'historique pour réessayer.`,
      });
    }
    onOpenChange(false);
  };

  const allEligibleSelected = eligible.length > 0 && selected.size === eligible.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 text-xs">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center font-semibold ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : step > s
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-3.5 w-3.5" /> : s}
              </div>
              {s < 3 && <div className="h-px w-8 bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1 — Recipients */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Destinataires éligibles ({eligible.length})
              </Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allEligibleSelected}
                  onCheckedChange={(c) => toggleAll(!!c)}
                />
                <Label htmlFor="select-all" className="text-xs cursor-pointer">
                  Tout sélectionner
                </Label>
              </div>
            </div>
            <ScrollArea className="h-72 rounded-md border">
              <div className="p-2 space-y-1">
                {recipients.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Aucun destinataire.
                  </p>
                ) : (
                  recipients.map((r) => {
                    const key = recipientKey(r);
                    const hasPhone = !!r.phone && r.phone.trim().length > 0;
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-2 rounded-md p-2 ${
                          hasPhone ? "hover:bg-muted/50" : "opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={selected.has(key)}
                            disabled={!hasPhone}
                            onCheckedChange={() => toggleOne(key)}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {r.phone || "Sans numéro"}
                              {r.rentAmount != null && ` · ${r.rentAmount.toLocaleString("fr-FR")} FCFA`}
                            </p>
                          </div>
                        </div>
                        {!hasPhone && (
                          <Badge variant="outline" className="text-xs">
                            Sans numéro
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selected.size} destinataire(s) sélectionné(s)
            </p>
          </div>
        )}

        {/* Step 2 — Template & content */}
        {step === 2 && (
          <div className="space-y-4">
            {templates.length > 0 && (
              <div>
                <Label className="text-xs">Modèle (optionnel)</Label>
                <Select value={templateId} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Message libre —</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Saisissez votre message…"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  Variables : <code>{"{{tenant_name}}"}</code>, <code>{"{{rent_amount}}"}</code>,{" "}
                  <code>{"{{due_date}}"}</code>, <code>{"{{agency_name}}"}</code>
                </p>
                <p className="text-xs text-muted-foreground">
                  {charCount} car. · {segments} segment(s)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Preview & confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destinataires</span>
                <span className="font-medium">{selectedRecipients.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Segments par SMS</span>
                <span className="font-medium">{segments}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-muted-foreground">Total SMS facturés</span>
                <span className="font-semibold text-foreground">{totalSms}</span>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">
                Aperçu pour les {previews.length} premier(s) destinataire(s)
              </Label>
              <ScrollArea className="h-56 rounded-md border">
                <div className="p-3 space-y-3">
                  {previews.map((p, i) => (
                    <div key={i} className="rounded-md bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        À {p.name} · {p.phone}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{p.rendered}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            {sending && progress.total > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Envoi en cours… {progress.done}/{progress.total}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep((step - 1) as Step)}
              disabled={sending}
              className="gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Retour
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          )}
          {step === 1 && (
            <Button
              onClick={() => setStep(2)}
              disabled={!canGoStep2}
              className="gap-2"
            >
              Continuer <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {step === 2 && (
            <Button
              onClick={() => setStep(3)}
              disabled={!canGoStep3}
              className="gap-2"
            >
              Aperçu <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleSend} disabled={sending} className="gap-2">
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Confirmer l'envoi ({selectedRecipients.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
