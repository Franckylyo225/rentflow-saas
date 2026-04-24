import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Calendar, Lock, Save, Clock, Mail, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

type Schedule = {
  id: string;
  label: string;
  template_id: string | null;
  email_template_id: string | null;
  is_active: boolean;
  send_email: boolean;
  slot_index: number;
  day_of_month: number;
  send_hour: number;
  send_minute: number;
  sort_order: number;
  offset_days: number;
};

type Template = { id: string; label: string };

interface Props {
  canEditAll: boolean;
  canEditBasic: boolean;
  planName: string;
}

const SLOT_LABELS: Record<number, string> = {
  1: "SMS principal",
  2: "SMS secondaire",
  3: "SMS de relance",
};

const SLOT_DEFAULT_LABELS: Record<number, string> = {
  1: "Rappel avant échéance",
  2: "Rappel veille échéance",
  3: "Relance après échéance",
};

export function SmsSchedulesEditor({ canEditAll, canEditBasic, planName }: Props) {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);
    const [schedRes, tplRes, emailTplRes] = await Promise.all([
      supabase
        .from("sms_schedules")
        .select("*")
        .eq("organization_id", orgId)
        .order("slot_index"),
      supabase.from("sms_templates").select("id, label").eq("organization_id", orgId),
      supabase.from("email_templates").select("id, label").eq("organization_id", orgId),
    ]);

    let rows = (schedRes.data || []) as Schedule[];

    // Ensure we have exactly 3 slots — create any missing
    const presentSlots = new Set(rows.map((r) => r.slot_index));
    const missing = [1, 2, 3].filter((s) => !presentSlots.has(s));
    if (missing.length > 0) {
      const tplFallback = (tplRes.data || [])[0]?.id || null;
      const inserts = missing.map((slot) => ({
        organization_id: orgId,
        slot_index: slot,
        label: SLOT_DEFAULT_LABELS[slot],
        template_id: tplFallback,
        day_of_month: slot === 1 ? 1 : slot === 2 ? 4 : 8,
        send_hour: 9,
        send_minute: 0,
        is_active: false,
        sort_order: slot,
        offset_days: slot === 1 ? -5 : slot === 2 ? -1 : 3,
      }));
      await supabase.from("sms_schedules").insert(inserts);
      const refresh = await supabase
        .from("sms_schedules")
        .select("*")
        .eq("organization_id", orgId)
        .order("slot_index");
      rows = (refresh.data || []) as Schedule[];
    }

    setSchedules(rows);
    setTemplates(tplRes.data || []);
    setEmailTemplates(emailTplRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const updateLocal = (slotIndex: number, patch: Partial<Schedule>) => {
    setSchedules((prev) =>
      prev.map((s) => (s.slot_index === slotIndex ? { ...s, ...patch } : s))
    );
  };

  const isSlotAllowed = (slotIndex: number) => {
    if (canEditAll) return true;
    if (canEditBasic) return slotIndex === 1;
    return false;
  };

  const saveSchedule = async (s: Schedule) => {
    if (!isSlotAllowed(s.slot_index)) {
      toast({
        title: "Plan insuffisant",
        description: `Avec ${planName}, seul le SMS principal est disponible.`,
        variant: "destructive",
      });
      return;
    }
    if (s.is_active && !s.template_id) {
      toast({
        title: "Modèle requis",
        description: "Choisissez un modèle de SMS avant d'activer ce créneau.",
        variant: "destructive",
      });
      return;
    }
    setSavingId(s.id);
    const { error } = await supabase
      .from("sms_schedules")
      .update({
        template_id: s.template_id,
        day_of_month: s.day_of_month,
        send_hour: s.send_hour,
        send_minute: 0,
        is_active: s.is_active,
        label: s.label,
      })
      .eq("id", s.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Programmation enregistrée" });
  };

  const days = useMemo(() => Array.from({ length: 28 }, (_, i) => i + 1), []);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Programmation des SMS automatiques</CardTitle>
            <CardDescription>
              Choisissez le jour du mois et l'heure d'envoi de chaque SMS. La programmation se
              répète automatiquement chaque mois.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedules.map((s) => {
          const allowed = isSlotAllowed(s.slot_index);
          return (
            <div
              key={s.id}
              className={`rounded-lg border p-4 space-y-3 ${
                allowed ? "border-border bg-card" : "border-dashed border-muted bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Créneau {s.slot_index}
                  </Badge>
                  <p className="font-medium text-sm">{SLOT_LABELS[s.slot_index]}</p>
                  {!allowed && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-muted text-muted-foreground gap-1"
                    >
                      <Lock className="h-2.5 w-2.5" /> Pro
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Actif</Label>
                  <Switch
                    checked={s.is_active && allowed}
                    onCheckedChange={(v) => updateLocal(s.slot_index, { is_active: v })}
                    disabled={!allowed}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Modèle de SMS</Label>
                  <Select
                    value={s.template_id || "none"}
                    onValueChange={(v) =>
                      updateLocal(s.slot_index, { template_id: v === "none" ? null : v })
                    }
                    disabled={!allowed}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un modèle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Aucun —</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Jour du mois</Label>
                  <Select
                    value={String(s.day_of_month)}
                    onValueChange={(v) =>
                      updateLocal(s.slot_index, { day_of_month: parseInt(v, 10) })
                    }
                    disabled={!allowed}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          Le {d} du mois
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Heure d'envoi
                  </Label>
                  <Select
                    value={String(s.send_hour)}
                    onValueChange={(v) =>
                      updateLocal(s.slot_index, { send_hour: parseInt(v, 10) })
                    }
                    disabled={!allowed}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {String(h).padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {allowed && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => saveSchedule(s)}
                    disabled={savingId === s.id}
                  >
                    {savingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground pt-2">
          💡 Les SMS sont envoyés automatiquement à l'heure choisie, à tous les locataires ayant un
          loyer impayé pour le mois en cours. Limité aux jours 1 à 28 pour garantir l'envoi chaque
          mois.
        </p>
      </CardContent>
    </Card>
  );
}
