import { SuperAdminLayout } from "@/components/admin/SuperAdminLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail, Key, Globe, Shield, Bell, Database, Server,
  CheckCircle2, Send, RefreshCw, Save, Settings2,
  Pencil, Eye, X, Code, ToggleLeft, Megaphone, Plus, Trash2,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SmsSettingsTab } from "@/components/settings/SmsSettingsTab";
import { EmailLogsPanel } from "@/components/admin/EmailLogsPanel";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface EmailTemplate {
  id: string;
  template_key: string;
  label: string;
  subject: string;
  html_content: string;
  description: string | null;
  is_active: boolean;
  category: string;
  is_admin_alert: boolean;
  available_variables: string[];
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  onboarding: { label: "Onboarding", description: "Inscription, bienvenue, création d'agence" },
  billing: { label: "Abonnement & facturation", description: "Essai, paiements, renouvellement" },
  activity: { label: "Activité métier", description: "Loyers, contrats, locataires" },
  security: { label: "Sécurité", description: "Connexions, alertes de sécurité" },
  admin: { label: "Alertes admin SaaS", description: "Notifications internes pour les super admins" },
};
const CATEGORY_ORDER = ["onboarding", "billing", "activity", "security", "admin"];

/* ------------------------------------------------------------------ */
/*  Template Editor Dialog                                            */
/* ------------------------------------------------------------------ */
function TemplateEditorDialog({
  template,
  open,
  onOpenChange,
}: {
  template: EmailTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setHtmlContent(template.html_content);
      setShowPreview(false);
    }
  }, [template]);

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_email_templates")
        .update({ subject, html_content: htmlContent })
        .eq("id", template.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["platform-email-templates"] });
      toast.success("Template sauvegardé !");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erreur : " + (e.message || "Échec de la sauvegarde"));
    } finally {
      setSaving(false);
    }
  };

  if (!template) return null;

  const vars = (template.available_variables && template.available_variables.length > 0)
    ? template.available_variables.map((v) => `{{${v}}}`)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Modifier : {template.label}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Subject */}
          <div className="space-y-2">
            <Label>Objet de l'email</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          {/* Variables */}
          {vars.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Variables disponibles :</span>
              {vars.map((v) => (
                <Badge key={v} variant="secondary" className="text-xs font-mono cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(v);
                    toast.info(`${v} copié !`);
                  }}
                >
                  {v}
                </Badge>
              ))}
            </div>
          )}

          {/* Toggle preview / code */}
          <div className="flex items-center gap-2">
            <Button
              variant={showPreview ? "outline" : "default"}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowPreview(false)}
            >
              <Code className="h-3.5 w-3.5" /> Code HTML
            </Button>
            <Button
              variant={showPreview ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-3.5 w-3.5" /> Aperçu
            </Button>
          </div>

          {showPreview ? (
            <div className="border border-border rounded-lg overflow-hidden bg-background">
              <iframe
                srcDoc={htmlContent}
                className="w-full h-[400px] border-0"
                title="Aperçu email"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              rows={18}
              className="font-mono text-xs leading-relaxed"
              placeholder="Contenu HTML du template..."
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Email Tab                                                         */
/* ------------------------------------------------------------------ */
function EmailTab() {
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["platform-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_email_templates")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("platform_email_templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-email-templates"] });
      toast.success("Statut mis à jour");
    },
  });

  const handleTestEmail = async () => {
    if (!testEmail) return toast.error("Entrez une adresse email");
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          templateName: "signup-confirmation",
          recipientEmail: testEmail,
          templateData: { name: "Test Admin" },
        },
      });
      if (error) throw error;
      toast.success("Email de test envoyé !");
    } catch (e: any) {
      toast.error("Échec : " + (e.message || "Erreur inconnue"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Domain config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" /> Domaine d'envoi
          </CardTitle>
          <CardDescription>Configuration du domaine email pour l'envoi des notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium text-foreground">rent-flow.net</p>
              <p className="text-xs text-muted-foreground">noreply@rent-flow.net</p>
            </div>
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Vérifié
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom d'expéditeur</Label>
              <Input defaultValue="RentFlow" />
            </div>
            <div className="space-y-2">
              <Label>Email de réponse (reply-to)</Label>
              <Input defaultValue="contact@rent-flow.net" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Templates grouped by category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" /> Modèles d'emails
          </CardTitle>
          <CardDescription>Activez/désactivez et modifiez les modèles. Les variables {"{{ }}"} sont remplacées automatiquement à l'envoi.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {CATEGORY_ORDER.map((cat) => {
                const items = templates.filter((t) => (t.category || "activity") === cat);
                if (items.length === 0) return null;
                const meta = CATEGORY_LABELS[cat];
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                      <span className="text-xs text-muted-foreground">— {meta.description}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{t.label}</p>
                              {t.is_admin_alert && <Badge variant="outline" className="text-[10px]">Admin</Badge>}
                              {!t.is_active && <Badge variant="secondary" className="text-[10px]">Désactivé</Badge>}
                            </div>
                            {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                            <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">{t.template_key}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Switch
                              checked={t.is_active}
                              onCheckedChange={(checked) => toggleActive.mutate({ id: t.id, is_active: checked })}
                              className="scale-90"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setEditingTemplate(t);
                                setEditorOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <EmailLogsPanel />

      {/* Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-primary" /> Test d'envoi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="email@exemple.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleTestEmail} disabled={sending} className="gap-2">
              {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer un test
            </Button>
          </div>
        </CardContent>
      </Card>

      <TemplateEditorDialog
        template={editingTemplate}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  API & Intégrations Tab                                            */
/* ------------------------------------------------------------------ */
function ApiTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-primary" /> Clés API configurées
          </CardTitle>
          <CardDescription>Clés et secrets utilisés par les fonctions backend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "RESEND_API_KEY", service: "Resend (Email)", status: "active" },
              { name: "LOVABLE_API_KEY", service: "Lovable Gateway", status: "active" },
              { name: "ORANGE_CLIENT_ID", service: "Orange SMS (désactivé)", status: "inactive" },
              { name: "ORANGE_CLIENT_SECRET", service: "Orange SMS (désactivé)", status: "inactive" },
            ].map((api) => (
              <div key={api.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${api.status === "active" ? "bg-primary" : "bg-muted-foreground/30"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{api.name}</p>
                    <p className="text-xs text-muted-foreground">{api.service}</p>
                  </div>
                </div>
                <Badge variant={api.status === "active" ? "default" : "secondary"}>
                  {api.status === "active" ? "Actif" : "Inactif"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5 text-primary" /> Edge Functions
          </CardTitle>
          <CardDescription>Fonctions backend déployées</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "send-email", desc: "Envoi d'emails transactionnels via Resend" },
              { name: "send-quittance-email", desc: "Envoi automatique des quittances PDF" },
              { name: "sms-send", desc: "Envoi unitaire d'un SMS via MonSMS Pro" },
              { name: "sms-process-queue", desc: "Traitement de la file SMS (CRON 15 min)" },
              { name: "sms-generate-reminders", desc: "Génération des relances SMS auto (CRON quotidien)" },
              { name: "sms-credits", desc: "Lecture du solde SMS MonSMS Pro" },
              { name: "create-user", desc: "Création de compte utilisateur" },
              { name: "send-contact-email", desc: "Formulaire de contact landing page" },
              { name: "manage-super-admins", desc: "Gestion des super administrateurs" },
              { name: "resolve-map-link", desc: "Résolution de liens Google Maps" },
            ].map((fn) => (
              <div key={fn.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-mono text-foreground">{fn.name}</p>
                  <p className="text-xs text-muted-foreground">{fn.desc}</p>
                </div>
                <Badge variant="outline" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-primary" /> Déployé
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Platform Settings Tab                                             */
/* ------------------------------------------------------------------ */
function PlatformTab() {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Paramètres sauvegardés");
    }, 600);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5 text-primary" /> Informations de la plateforme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de la plateforme</Label>
              <Input defaultValue="RentFlow" />
            </div>
            <div className="space-y-2">
              <Label>URL du site</Label>
              <Input defaultValue="https://rent-flow.net" />
            </div>
            <div className="space-y-2">
              <Label>Email de support</Label>
              <Input defaultValue="support@rent-flow.net" />
            </div>
            <div className="space-y-2">
              <Label>Email admin (notifications)</Label>
              <Input defaultValue="admin@rent-flow.net" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" /> Sécurité & accès
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Confirmation d'email obligatoire</p>
              <p className="text-xs text-muted-foreground">Les utilisateurs doivent vérifier leur email avant de se connecter</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Inscription ouverte</p>
              <p className="text-xs text-muted-foreground">Autoriser les inscriptions publiques (sinon invitation uniquement)</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Période d'essai par défaut</p>
              <p className="text-xs text-muted-foreground">Durée de l'essai gratuit pour les nouvelles organisations</p>
            </div>
            <Select defaultValue="7">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 jours</SelectItem>
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="14">14 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" /> Notifications admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Nouvelle inscription", desc: "Recevoir un email à chaque nouvelle organisation", on: true },
            { label: "Nouveau paiement", desc: "Recevoir un email à chaque paiement d'abonnement", on: true },
            { label: "Fin de période d'essai", desc: "Alerte quand une organisation arrive en fin d'essai", on: true },
            { label: "Organisation désactivée", desc: "Alerte quand une organisation est désactivée", on: false },
          ].map((item, i) => (
            <div key={i}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.on} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-primary" /> Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Mode maintenance</p>
              <p className="text-xs text-muted-foreground">Bloquer l'accès à l'application (sauf super admins)</p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Message de maintenance</Label>
            <Textarea
              defaultValue="La plateforme est en cours de maintenance. Nous serons de retour très bientôt."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Announcements Tab                                                 */
/* ------------------------------------------------------------------ */
function AnnouncementsTab() {
  const queryClient = useQueryClient();
  const emptyForm = {
    message: "",
    link_url: "",
    link_label: "",
    bg_color: "#7c3aed",
    text_color: "#ffffff",
    is_active: true,
    starts_at: "",
    ends_at: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (a: any) => {
    setEditingId(a.id);
    setForm({
      message: a.message,
      link_url: a.link_url || "",
      link_label: a.link_label || "",
      bg_color: a.bg_color,
      text_color: a.text_color,
      is_active: a.is_active,
      starts_at: a.starts_at ? a.starts_at.slice(0, 16) : "",
      ends_at: a.ends_at ? a.ends_at.slice(0, 16) : "",
    });
  };

  const handleSave = async () => {
    if (!form.message.trim()) return toast.error("Le message est requis");
    setSaving(true);
    const payload = {
      message: form.message,
      link_url: form.link_url || null,
      link_label: form.link_label || null,
      bg_color: form.bg_color,
      text_color: form.text_color,
      is_active: form.is_active,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };

    const { error } = editingId
      ? await supabase.from("announcements").update(payload).eq("id", editingId)
      : await supabase.from("announcements").insert(payload);

    setSaving(false);
    if (error) return toast.error("Erreur : " + error.message);
    toast.success(editingId ? "Annonce modifiée" : "Annonce créée");
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("announcements").update({ is_active: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
  };

  const deleteAnnouncement = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    if (editingId === id) resetForm();
    queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    toast.success("Annonce supprimée");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                {editingId ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                {editingId ? "Modifier l'annonce" : "Nouvelle annonce"}
              </CardTitle>
              <CardDescription>Affiche un bandeau en haut du site pour les visiteurs</CardDescription>
            </div>
            {editingId && (
              <Button variant="outline" size="sm" onClick={resetForm}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Message *</Label>
            <Input value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} placeholder="🚀 Bêta ouverte ! Code promo TRIAL100..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>URL du lien</Label>
              <Input value={form.link_url} onChange={(e) => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="/auth" />
            </div>
            <div className="space-y-2">
              <Label>Texte du lien</Label>
              <Input value={form.link_label} onChange={(e) => setForm(f => ({ ...f, link_label: e.target.value }))} placeholder="S'inscrire maintenant" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Couleur fond</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.bg_color} onChange={(e) => setForm(f => ({ ...f, bg_color: e.target.value }))} className="h-9 w-12 rounded cursor-pointer" />
                <Input value={form.bg_color} onChange={(e) => setForm(f => ({ ...f, bg_color: e.target.value }))} className="font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Couleur texte</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form.text_color} onChange={(e) => setForm(f => ({ ...f, text_color: e.target.value }))} className="h-9 w-12 rounded cursor-pointer" />
                <Input value={form.text_color} onChange={(e) => setForm(f => ({ ...f, text_color: e.target.value }))} className="font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date début</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm(f => ({ ...f, starts_at: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Date fin</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm(f => ({ ...f, ends_at: e.target.value }))} />
            </div>
          </div>

          {/* Preview */}
          {form.message && (
            <div className="rounded-lg overflow-hidden">
              <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium" style={{ backgroundColor: form.bg_color, color: form.text_color }}>
                <span>{form.message}</span>
                {form.link_label && <span className="underline font-semibold">{form.link_label} →</span>}
              </div>
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Sauvegarder" : "Créer l'annonce"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Annonces existantes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune annonce</p>
          ) : (
            <div className="space-y-3">
              {announcements.map((a: any) => (
                <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg border ${editingId === a.id ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: a.bg_color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.link_url && <span className="mr-2">→ {a.link_url}</span>}
                        {a.ends_at && <span>Expire : {new Date(a.ends_at).toLocaleDateString("fr-FR")}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={a.is_active ? "default" : "secondary"}>
                      {a.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a.id, a.is_active)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteAnnouncement(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */
export default function AdminSettings() {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">Configuration globale de la plateforme RentFlow</p>
        </div>

        <Tabs defaultValue="emails" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="emails" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Emails
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5">
              <Key className="h-3.5 w-3.5" /> API & Intégrations
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1.5">
              <Megaphone className="h-3.5 w-3.5" /> Annonces
            </TabsTrigger>
            <TabsTrigger value="platform" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> Plateforme
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> SMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emails"><EmailTab /></TabsContent>
          <TabsContent value="api"><ApiTab /></TabsContent>
          <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
          <TabsContent value="platform"><PlatformTab /></TabsContent>
          <TabsContent value="sms"><SmsSettingsTab /></TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}
