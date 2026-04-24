import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Calendar, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

type Schedule = {
  id: string;
  label: string;
  offset_days: number;
  template_id: string | null;
  is_active: boolean;
  sort_order: number;
};

type Template = { id: string; label: string };

interface Props {
  canEditAll: boolean;
  canEditBasic: boolean;
  planName: string;
}

export function SmsSchedulesEditor({ canEditAll, canEditBasic, planName }: Props) {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);
    const [schedRes, tplRes] = await Promise.all([
      supabase
        .from("sms_schedules")
        .select("*")
        .eq("organization_id", orgId)
        .order("sort_order")
        .order("offset_days"),
      supabase.from("sms_templates").select("id, label").eq("organization_id", orgId),
    ]);
    setSchedules(schedRes.data || []);
    setTemplates(tplRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const isOffsetAllowed = (offset: number) => {
    if (canEditAll) return true;
    if (canEditBasic) return offset === -5;
    return false;
  };

  const toggleActive = async (s: Schedule, val: boolean) => {
    if (val && !isOffsetAllowed(s.offset_days)) {
      toast({
        title: "Plan insuffisant",
        description: `Cette échéance n'est pas disponible avec l'offre ${planName}.`,
        variant: "destructive",
      });
      return;
    }
    await supabase.from("sms_schedules").update({ is_active: val }).eq("id", s.id);
    fetchData();
  };

  const handleSave = async () => {
    if (!editing || !orgId) return;
    if (!isOffsetAllowed(editing.offset_days)) {
      toast({
        title: "Échéance non autorisée",
        description: `Avec ${planName}, seul J-5 est disponible.`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const payload = {
      label: editing.label,
      offset_days: editing.offset_days,
      template_id: editing.template_id,
      is_active: editing.is_active,
    };
    if (editing.id) {
      await supabase.from("sms_schedules").update(payload).eq("id", editing.id);
    } else {
      await supabase
        .from("sms_schedules")
        .insert({ ...payload, organization_id: orgId, sort_order: schedules.length });
    }
    setSaving(false);
    setEditing(null);
    toast({ title: "Programmation enregistrée" });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("sms_schedules").delete().eq("id", id);
    toast({ title: "Programmation supprimée" });
    fetchData();
  };

  const formatOffset = (offset: number) => {
    if (offset === 0) return "Le jour J";
    if (offset < 0) return `J${offset} (${Math.abs(offset)}j avant échéance)`;
    return `J+${offset} (${offset}j après échéance)`;
  };

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
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Programmation automatique</CardTitle>
                <CardDescription>
                  Les SMS sont générés chaque matin selon les échéances de loyer.
                </CardDescription>
              </div>
            </div>
            {canEditAll && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() =>
                  setEditing({
                    id: "",
                    label: "",
                    offset_days: -3,
                    template_id: null,
                    is_active: true,
                    sort_order: schedules.length,
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {schedules.map((s) => {
            const allowed = isOffsetAllowed(s.offset_days);
            const tpl = templates.find((t) => t.id === s.template_id);
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                  allowed ? "border-border bg-card" : "border-dashed border-muted bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Switch
                    checked={s.is_active && allowed}
                    onCheckedChange={(v) => toggleActive(s, v)}
                    disabled={!allowed}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{s.label}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {formatOffset(s.offset_days)}
                      </Badge>
                      {!allowed && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-muted text-muted-foreground gap-1"
                        >
                          <Lock className="h-2.5 w-2.5" /> Pro
                        </Badge>
                      )}
                    </div>
                    {tpl && (
                      <p className="text-xs text-muted-foreground mt-0.5">Modèle : {tpl.label}</p>
                    )}
                  </div>
                </div>
                {canEditAll && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {schedules.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucune programmation. Ajoutez-en une pour activer les rappels automatiques.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Modifier la programmation" : "Nouvelle programmation"}
            </DialogTitle>
            <DialogDescription>
              Définissez quand le SMS sera envoyé par rapport à la date d'échéance du loyer.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Libellé</Label>
                <Input
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="Ex : Rappel pré-échéance"
                />
              </div>
              <div>
                <Label className="text-xs">
                  Décalage (jours) — négatif = avant échéance, positif = après
                </Label>
                <Input
                  type="number"
                  value={editing.offset_days}
                  onChange={(e) =>
                    setEditing({ ...editing, offset_days: parseInt(e.target.value, 10) || 0 })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatOffset(editing.offset_days)}
                </p>
              </div>
              <div>
                <Label className="text-xs">Modèle de SMS</Label>
                <Select
                  value={editing.template_id || "none"}
                  onValueChange={(v) =>
                    setEditing({ ...editing, template_id: v === "none" ? null : v })
                  }
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
              <div className="flex items-center justify-between pt-2">
                <Label className="text-sm">Actif</Label>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving || !editing?.label}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
