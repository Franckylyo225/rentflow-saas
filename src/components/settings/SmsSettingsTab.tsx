import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageSquare, Save, Loader2, Info, Clock, AlertTriangle, Send, TestTube, Phone, Settings2, Wallet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SmsHistoryTable } from "./SmsHistoryTable";

const TIMELINE_ICONS: Record<string, { icon: typeof MessageSquare; label: string; color: string; bg: string }> = {
  before_5: { icon: Clock, label: "J-5", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  after_1: { icon: AlertTriangle, label: "J+1", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  after_7: { icon: AlertTriangle, label: "J+7", color: "text-destructive", bg: "bg-destructive/10" },
};

export function SmsSettingsTab() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [senderName, setSenderName] = useState("");
  const [savingSender, setSavingSender] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Credits state
  const [creditAvailable, setCreditAvailable] = useState<number | null>(null);
  const [creditUsed, setCreditUsed] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);

  // Test SMS state
  const [testPhone, setTestPhone] = useState("");
  const [testTemplateKey, setTestTemplateKey] = useState("before_5");
  const [sendingTest, setSendingTest] = useState(false);

  const fetchCredits = async () => {
    setLoadingCredits(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-credits", { body: {} });
      if (!error && data?.success) {
        setCreditAvailable(data.creditAvailable);
        setCreditUsed(data.creditUsed);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingCredits(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchCredits();

    // Load org settings
    supabase
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single()
      .then(({ data: profile }) => {
        if (!profile) return;
        setOrgId(profile.organization_id);
        supabase
          .from("organizations")
          .select("sms_sender_name")
          .eq("id", profile.organization_id)
          .single()
          .then(({ data: org }) => {
            setSenderName(org?.sms_sender_name || "RentFlow");
          });
      });

    // Load templates
    supabase.from("notification_templates").select("*").order("created_at").then(({ data }) => {
      if (data) {
        setTemplates(data);
        if (data.length > 0) setExpandedTemplate(data[0].id);
      }
      setLoading(false);
    });
  }, [user]);

  const updateTemplate = (id: string, field: string, value: string | boolean) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSaveSender = async () => {
    if (!orgId) return;
    setSavingSender(true);
    const { error } = await supabase
      .from("organizations")
      .update({ sms_sender_name: senderName })
      .eq("id", orgId);
    setSavingSender(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Nom d'expéditeur mis à jour");
    }
  };

  const handleSaveTemplates = async () => {
    setSaving(true);
    for (const t of templates) {
      await supabase.from("notification_templates").update({
        sms_enabled: t.sms_enabled,
        sms_content: t.sms_content,
      }).eq("id", t.id);
    }
    setSaving(false);
    toast.success("Modèles SMS sauvegardés");
  };

  const handleSendTest = async () => {
    if (!testPhone) {
      toast.error("Veuillez saisir un numéro de téléphone");
      return;
    }
    if (!orgId) {
      toast.error("Organisation introuvable");
      return;
    }

    const template = templates.find(t => t.template_key === testTemplateKey);
    if (!template) {
      toast.error("Modèle introuvable");
      return;
    }

    // Replace variables with test data
    const testMessage = template.sms_content
      .replace(/\{\{nom\}\}/g, "Jean Dupont")
      .replace(/\{\{montant\}\}/g, "150 000")
      .replace(/\{\{date_echeance\}\}/g, "05/04/2026");

    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          to: testPhone,
          message: testMessage,
          organizationId: orgId,
          recipientName: "Test",
          templateKey: testTemplateKey,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`SMS de test envoyé à ${testPhone}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const enabledSmsCount = templates.filter(t => t.sms_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Configurez les relances automatiques par SMS</p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="gap-1.5 text-xs font-normal">
              <MessageSquare className="h-3 w-3" /> {enabledSmsCount} SMS actif{enabledSmsCount > 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        <Button size="sm" className="gap-2" onClick={handleSaveTemplates} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Sauvegarder
        </Button>
      </div>

      {/* Sender config */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Expéditeur SMS</CardTitle>
              <CardDescription>Nom affiché comme expéditeur des SMS (max 11 caractères alphanumériques)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 w-full space-y-1">
              <Label htmlFor="senderName" className="text-sm">Nom de l'expéditeur</Label>
              <Input
                id="senderName"
                value={senderName}
                onChange={e => setSenderName(e.target.value.slice(0, 11))}
                placeholder="RentFlow"
                className="max-w-xs"
                maxLength={11}
              />
              <p className="text-xs text-muted-foreground">{senderName.length}/11 caractères</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 shrink-0"
              onClick={handleSaveSender}
              disabled={savingSender}
            >
              {savingSender ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test SMS */}
      <Card className="border-border">
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-3 flex items-center gap-2">
            <TestTube className="h-4 w-4 text-primary" /> Envoyer un SMS de test
          </Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 w-full space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="tel"
                  placeholder="0758160904"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  className="max-w-xs"
                />
                <select
                  value={testTemplateKey}
                  onChange={e => setTestTemplateKey(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {templates.filter(t => t.sms_enabled).map(t => {
                    const config = TIMELINE_ICONS[t.template_key];
                    return (
                      <option key={t.id} value={t.template_key}>
                        {config?.label || t.template_key} — {t.label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                Envoie le modèle SMS sélectionné avec des données fictives
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 shrink-0"
              onClick={handleSendTest}
              disabled={sendingTest || !testPhone}
            >
              {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer le test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline visual */}
      <Card className="border-border overflow-hidden">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Chronologie des relances SMS</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {templates.map((t, i) => {
              const config = TIMELINE_ICONS[t.template_key] || { icon: MessageSquare, label: "?", color: "text-primary", bg: "bg-primary/10" };
              const Icon = config.icon;
              const isActive = t.sms_enabled;
              return (
                <div key={t.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedTemplate(expandedTemplate === t.id ? null : t.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${
                      expandedTemplate === t.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    } ${!isActive ? "opacity-50" : ""}`}
                  >
                    <div className={`p-1.5 rounded-md ${config.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{config.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{t.label}</p>
                    </div>
                    {t.sms_enabled && <Phone className="h-3 w-3 text-muted-foreground ml-1" />}
                  </button>
                  {i < templates.length - 1 && (
                    <div className="h-px w-6 bg-border flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Variables info */}
      <Card className="border-border bg-accent/30">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-4 w-4 text-accent-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-accent-foreground">
              <strong>Variables disponibles :</strong>{" "}
              <code className="text-xs bg-background/50 px-1.5 py-0.5 rounded">{"{{nom}}"}</code>{" "}
              <code className="text-xs bg-background/50 px-1.5 py-0.5 rounded">{"{{montant}}"}</code>{" "}
              <code className="text-xs bg-background/50 px-1.5 py-0.5 rounded">{"{{date_echeance}}"}</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Les relances s'arrêtent automatiquement lorsque le statut passe à "Payé".</p>
          </div>
        </CardContent>
      </Card>

      {/* Template details */}
      <div className="space-y-4">
        {templates.map(template => {
          const config = TIMELINE_ICONS[template.template_key] || { icon: MessageSquare, label: "?", color: "text-primary", bg: "bg-primary/10" };
          const Icon = config.icon;
          const isExpanded = expandedTemplate === template.id;

          if (!isExpanded) return null;

          return (
            <Card key={template.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bg}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.label}
                      <Badge variant="outline" className="text-[10px] font-normal">{config.label}</Badge>
                    </CardTitle>
                    <CardDescription>Modèle de relance SMS automatique</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Phone className="h-4 w-4 text-primary" /> SMS activé
                  </Label>
                  <Switch checked={template.sms_enabled} onCheckedChange={v => updateTemplate(template.id, "sms_enabled", v)} />
                </div>
                <Textarea
                  value={template.sms_content}
                  onChange={e => updateTemplate(template.id, "sms_content", e.target.value)}
                  rows={4}
                  className="text-sm resize-none"
                  disabled={!template.sms_enabled}
                  placeholder="Contenu du SMS..."
                />
                <p className="text-xs text-muted-foreground">{template.sms_content?.length || 0} caractères — {Math.ceil((template.sms_content?.length || 1) / 160)} SMS</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* SMS History */}
      <SmsHistoryTable />
    </div>
  );
}
