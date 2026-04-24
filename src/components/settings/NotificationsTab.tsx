import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, ArrowRight, Sparkles, Pencil } from "lucide-react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

type EmailTemplate = {
  id: string;
  template_key: string;
  label: string;
  subject: string;
  html_content: string;
  is_system: boolean;
};

export function NotificationsTab() {
  const navigate = useNavigate();
  const { hasFeature, planName } = useFeatureAccess();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  const canEmail = hasFeature("email_reminders");
  const canFull = hasFeature("sms_auto_full");
  const slotCount = canFull ? 3 : 1;

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    if (!orgId) return;
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .eq("organization_id", orgId)
      .order("template_key");
    setTemplates((data || []) as EmailTemplate[]);
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({
        label: editing.label,
        subject: editing.subject,
        html_content: editing.html_content,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Modèle enregistré" });
    setEditing(null);
    loadTemplates();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                Notifications email automatiques
                <Badge variant="outline" className="text-[10px] font-normal gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> {planName}
                </Badge>
              </CardTitle>
              <CardDescription>
                {canEmail
                  ? `Vous pouvez activer jusqu'à ${slotCount} créneau${slotCount > 1 ? "x" : ""} d'email${slotCount > 1 ? "s" : ""} de relance par mois.`
                  : "Les emails de relance ne sont pas inclus dans votre plan."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Configuration unifiée SMS + Email</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Pour éviter la double configuration, les emails de relance sont envoyés en miroir des
              SMS. Pour chaque créneau (jour + heure), vous pouvez choisir d'envoyer un SMS, un
              email, ou les deux.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 mt-2"
              onClick={() => navigate("/settings?tab=sms")}
            >
              Configurer les créneaux <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1 pt-2">
            <p>
              📧 <strong>Comment ça marche :</strong> à l'heure choisie, l'email part vers tous les
              locataires actifs ayant un loyer impayé pour le mois en cours et un email renseigné.
            </p>
            <p>
              🛡 <strong>Anti-doublon :</strong> un seul email par locataire et par créneau chaque
              mois.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Modèles d'emails de relance</CardTitle>
          <CardDescription>
            Personnalisez le sujet et le contenu HTML des emails envoyés aux locataires.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun modèle d'email pour le moment.
            </p>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{tpl.label}</p>
                    {tpl.is_system && (
                      <Badge variant="outline" className="text-[10px]">Système</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{tpl.subject}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                  onClick={() => setEditing(tpl)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
              </div>
            ))
          )}
          <p className="text-[10px] text-muted-foreground pt-2">
            Variables disponibles : <code>{"{{tenant_name}}"}</code>, <code>{"{{rent_amount}}"}</code>,{" "}
            <code>{"{{due_date}}"}</code>, <code>{"{{agency_name}}"}</code>
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le modèle d'email</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Libellé</Label>
                <Input
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  disabled={editing.is_system}
                />
              </div>
              <div>
                <Label className="text-xs">Sujet de l'email</Label>
                <Input
                  value={editing.subject}
                  onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Contenu HTML</Label>
                <Textarea
                  value={editing.html_content}
                  onChange={(e) => setEditing({ ...editing, html_content: e.target.value })}
                  rows={12}
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Variables : {"{{tenant_name}}"}, {"{{rent_amount}}"}, {"{{due_date}}"}, {"{{agency_name}}"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
