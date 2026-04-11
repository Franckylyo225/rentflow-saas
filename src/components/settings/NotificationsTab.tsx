import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bell, Mail, Save, Loader2, Info, Clock, AlertTriangle, Send, TestTube } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TIMELINE_ICONS: Record<string, { icon: typeof Bell; label: string; color: string; bg: string }> = {
  before_5: { icon: Clock, label: "J-5", color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  after_1: { icon: AlertTriangle, label: "J+1", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  after_7: { icon: AlertTriangle, label: "J+7", color: "text-destructive", bg: "bg-destructive/10" },
};

export function NotificationsTab() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [emailsSentThisMonth, setEmailsSentThisMonth] = useState(0);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Load templates
    supabase.from("notification_templates").select("*").order("created_at").then(({ data }) => {
      if (data) {
        setTemplates(data);
        if (data.length > 0) setExpandedTemplate(data[0].id);
      }
      setLoading(false);
    });

    // Load email stats for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    supabase
      .from("email_reminder_logs")
      .select("*")
      .gte("sent_at", startOfMonth.toISOString())
      .eq("status", "sent")
      .then(({ data }) => {
        setEmailsSentThisMonth(data?.length || 0);
      });

    // Load recent logs
    supabase
      .from("email_reminder_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setRecentLogs(data || []);
      });
  }, [user]);

  const updateTemplate = (id: string, field: string, value: string | boolean) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSave = async () => {
    setSaving(true);
    for (const t of templates) {
      await supabase.from("notification_templates").update({
        email_enabled: t.email_enabled,
        email_content: t.email_content,
      }).eq("id", t.id);
    }
    setSaving(false);
    toast.success("Paramètres de relance sauvegardés");
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const enabledEmailCount = templates.filter(t => t.email_enabled).length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Configurez les relances automatiques par email</p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="gap-1.5 text-xs font-normal">
              <Mail className="h-3 w-3" /> {enabledEmailCount} Email{enabledEmailCount > 1 ? "s" : ""} actif{enabledEmailCount > 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline" className="gap-1.5 text-xs font-normal">
              <Send className="h-3 w-3" /> {emailsSentThisMonth} envoyé{emailsSentThisMonth > 1 ? "s" : ""} ce mois
            </Badge>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowLogs(!showLogs)}>
            <Clock className="h-4 w-4" /> Historique
          </Button>
          <Button size="sm" className="gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Sauvegarder
          </Button>
        </div>
      </div>

      {/* Logs panel */}
      {showLogs && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dernières relances envoyées</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentLogs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                Aucune relance envoyée
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentLogs.map(log => {
                  const config = TIMELINE_ICONS[log.template_key] || { label: "?", color: "text-primary", bg: "bg-primary/10" };
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <Badge variant="outline" className={`text-[10px] ${config.color}`}>{config.label}</Badge>
                      <span className="flex-1 truncate">{log.recipient_email}</span>
                      <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-[10px]">
                        {log.status === "sent" ? "Envoyé" : "Erreur"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.sent_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline visual */}
      <Card className="border-border overflow-hidden">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Chronologie des relances</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {templates.map((t, i) => {
              const config = TIMELINE_ICONS[t.template_key] || { icon: Bell, label: "?", color: "text-primary", bg: "bg-primary/10" };
              const Icon = config.icon;
              const isActive = t.email_enabled;
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
                    {t.email_enabled && <Mail className="h-3 w-3 text-muted-foreground ml-1" />}
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
          const config = TIMELINE_ICONS[template.template_key] || { icon: Bell, label: "?", color: "text-primary", bg: "bg-primary/10" };
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
                    <CardDescription>Modèle de relance email automatique</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Mail className="h-4 w-4 text-primary" /> Email activé
                  </Label>
                  <Switch checked={template.email_enabled} onCheckedChange={v => updateTemplate(template.id, "email_enabled", v)} />
                </div>
                <Textarea
                  value={template.email_content}
                  onChange={e => updateTemplate(template.id, "email_content", e.target.value)}
                  rows={6}
                  className="text-sm resize-none"
                  disabled={!template.email_enabled}
                  placeholder="Contenu de l'email..."
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
