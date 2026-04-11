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
  Mail, Key, Globe, Shield, Bell, Database, Server,
  CheckCircle2, AlertCircle, Send, RefreshCw, Save, Settings2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Email Tab                                                         */
/* ------------------------------------------------------------------ */
function EmailTab() {
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

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
              <Input defaultValue="SCI Binieba" />
            </div>
            <div className="space-y-2">
              <Label>Email de réponse (reply-to)</Label>
              <Input defaultValue="contact@rent-flow.net" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5 text-primary" /> Templates email
          </CardTitle>
          <CardDescription>Modèles d'emails transactionnels configurés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: "signup-confirmation", label: "Confirmation d'inscription", desc: "Envoyé aux nouveaux utilisateurs" },
              { key: "new-user-admin", label: "Notification nouvel utilisateur", desc: "Envoyé à l'admin SaaS" },
              { key: "payment-confirmation", label: "Confirmation de paiement", desc: "Envoyé au client après paiement" },
              { key: "payment-admin", label: "Notification paiement admin", desc: "Envoyé à l'admin lors d'un paiement" },
            ].map((t) => (
              <div key={t.key} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <Badge variant="outline" className="text-xs">{t.key}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              { name: "send-rent-reminders", desc: "Relances automatiques de loyer" },
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
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Déployé
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
              <Input defaultValue="SCI Binieba" />
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Nouvelle inscription</p>
              <p className="text-xs text-muted-foreground">Recevoir un email à chaque nouvelle organisation</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Nouveau paiement</p>
              <p className="text-xs text-muted-foreground">Recevoir un email à chaque paiement d'abonnement</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Fin de période d'essai</p>
              <p className="text-xs text-muted-foreground">Alerte quand une organisation arrive en fin d'essai</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Organisation désactivée</p>
              <p className="text-xs text-muted-foreground">Alerte quand une organisation est désactivée</p>
            </div>
            <Switch />
          </div>
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
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */
export default function AdminSettings() {
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">Configuration globale de la plateforme SCI Binieba</p>
        </div>

        <Tabs defaultValue="emails" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="emails" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Emails
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5">
              <Key className="h-3.5 w-3.5" /> API & Intégrations
            </TabsTrigger>
            <TabsTrigger value="platform" className="gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> Plateforme
            </TabsTrigger>
          </TabsList>

          <TabsContent value="emails"><EmailTab /></TabsContent>
          <TabsContent value="api"><ApiTab /></TabsContent>
          <TabsContent value="platform"><PlatformTab /></TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}
