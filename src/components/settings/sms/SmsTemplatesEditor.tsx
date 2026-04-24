import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Plus, Trash2, FileText, Variable, Eye, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useOrganizationSettings } from "@/hooks/useOrganizationSettings";
import { toast } from "@/hooks/use-toast";

type VarDef = { key: string; token: string; desc: string; sample: string };

const AVAILABLE_VARS: VarDef[] = [
  { key: "tenant_name", token: "{{tenant_name}}", desc: "Nom du locataire", sample: "Awa Koné" },
  { key: "rent_amount", token: "{{rent_amount}}", desc: "Montant du loyer", sample: "150 000" },
  { key: "due_date", token: "{{due_date}}", desc: "Date d'échéance", sample: "05/05/2026" },
  { key: "month", token: "{{month}}", desc: "Mois concerné", sample: "Mai 2026" },
  { key: "agency_name", token: "{{agency_name}}", desc: "Nom de l'agence", sample: "Mon agence" },
  { key: "remaining_days", token: "{{remaining_days}}", desc: "Jours restants", sample: "3" },
  { key: "late_days", token: "{{late_days}}", desc: "Jours de retard", sample: "7" },
];

function renderPreview(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }
  return result;
}

type SmsTemplate = {
  id: string;
  template_key: string;
  label: string;
  content: string;
  is_system: boolean;
};

interface Props {
  canEdit: boolean;
}

export function SmsTemplatesEditor({ canEdit }: Props) {
  const { profile } = useProfile();
  const { settings } = useOrganizationSettings();
  const orgId = profile?.organization_id;
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SmsTemplate | null>(null);
  const [deleting, setDeleting] = useState<SmsTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [sampleVars, setSampleVars] = useState<Record<string, string>>(() =>
    Object.fromEntries(AVAILABLE_VARS.map((v) => [v.key, v.sample])),
  );

  // Sync agency name from org settings when available
  useEffect(() => {
    if (settings?.name) {
      setSampleVars((prev) => ({ ...prev, agency_name: settings.name }));
    }
  }, [settings?.name]);

  const fetchTemplates = async () => {
    if (!orgId) return;
    setLoading(true);
    const { data } = await supabase
      .from("sms_templates")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at");
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleSave = async () => {
    if (!editing || !orgId) return;
    setSaving(true);
    if (editing.id) {
      const { error } = await supabase
        .from("sms_templates")
        .update({ label: editing.label, content: editing.content })
        .eq("id", editing.id);
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      else toast({ title: "Modèle mis à jour" });
    } else {
      const { error } = await supabase.from("sms_templates").insert({
        organization_id: orgId,
        template_key: `custom_${Date.now()}`,
        label: editing.label,
        content: editing.content,
        is_system: false,
      });
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      else toast({ title: "Modèle créé" });
    }
    setSaving(false);
    setEditing(null);
    fetchTemplates();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("sms_templates").delete().eq("id", deleting.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Modèle supprimé" });
    setDeleting(null);
    fetchTemplates();
  };

  const insertVar = (v: string) => {
    if (!editing) return;
    setEditing({ ...editing, content: `${editing.content}${v}` });
  };

  const charCount = editing?.content.length || 0;
  const smsCount = Math.ceil(charCount / 160) || 1;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Modèles SMS</CardTitle>
                <CardDescription>
                  {templates.length} modèle{templates.length > 1 ? "s" : ""} disponible
                  {templates.length > 1 ? "s" : ""}
                </CardDescription>
              </div>
            </div>
            {canEdit && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() =>
                  setEditing({ id: "", template_key: "", label: "", content: "", is_system: false })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Nouveau modèle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.map((tpl) => {
            const preview = renderPreview(tpl.content, sampleVars);
            return (
              <div
                key={tpl.id}
                className="border border-border rounded-lg p-4 space-y-2 bg-card hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{tpl.label}</p>
                      {tpl.is_system && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          Système
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground/80 font-mono whitespace-pre-wrap break-words">
                      {tpl.content}
                    </p>
                    <div className="mt-2 p-2.5 rounded-md bg-muted/40 border border-border/50">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        <Eye className="h-2.5 w-2.5" /> Aperçu
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {preview}
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditing(tpl)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {!tpl.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleting(tpl)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun modèle pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
            <DialogDescription>
              Insérez des variables dynamiques en cliquant sur les jetons ci-dessous.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Nom du modèle</Label>
                <Input
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="Ex : Rappel J-3"
                  disabled={editing.is_system}
                />
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1">
                  <Variable className="h-3 w-3" /> Variables disponibles
                </Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {AVAILABLE_VARS.map((v) => (
                    <Button
                      key={v.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-mono gap-1"
                      onClick={() => insertVar(v.key)}
                      title={v.desc}
                    >
                      {v.key}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Contenu du SMS</Label>
                <Textarea
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  rows={5}
                  className="font-mono text-sm"
                />
                <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                  <span>
                    {charCount} caractère{charCount > 1 ? "s" : ""} • {smsCount} SMS
                  </span>
                  {charCount > 160 && (
                    <span className="text-warning">
                      Au-delà de 160 caractères = SMS multi-segments
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !editing?.label || !editing?.content}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le modèle « {deleting?.label} » sera supprimé. Les programmations associées
              perdront leur référence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
