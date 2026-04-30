import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, LifeBuoy, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Prefs = {
  ticket_status_change: boolean;
  ticket_new_reply: boolean;
  ticket_internal_note: boolean;
  rent_late: boolean;
  rent_partial: boolean;
  rent_paid: boolean;
};

const DEFAULTS: Prefs = {
  ticket_status_change: true,
  ticket_new_reply: true,
  ticket_internal_note: true,
  rent_late: true,
  rent_partial: true,
  rent_paid: true,
};

export function NotificationPreferencesTab() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          ticket_status_change: data.ticket_status_change,
          ticket_new_reply: data.ticket_new_reply,
          ticket_internal_note: data.ticket_internal_note,
          rent_late: data.rent_late,
          rent_partial: data.rent_partial,
          rent_paid: data.rent_paid,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const update = async (key: keyof Prefs, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Échec de la sauvegarde");
      setPrefs(prefs);
    } else {
      toast.success("Préférence mise à jour");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const Row = ({ k, title, desc }: { k: keyof Prefs; title: string; desc: string }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={prefs[k]} onCheckedChange={(v) => update(k, v)} disabled={saving} />
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LifeBuoy className="h-4 w-4 text-primary" /> Tickets de support
          </CardTitle>
          <CardDescription>Choisissez quelles alertes recevoir pour vos tickets.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <Row k="ticket_status_change" title="Changement de statut"
               desc="Notification quand un ticket passe à En cours, Résolu, Fermé, etc." />
          <Row k="ticket_new_reply" title="Nouvelle réponse"
               desc="Notification quand le support (ou l'agence) répond à un ticket." />
          <Row k="ticket_internal_note" title="Notes internes (admins)"
               desc="Réservé aux super-admins : alertes sur les notes internes." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-primary" /> Loyers
          </CardTitle>
          <CardDescription>Notifications liées aux paiements de loyers.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <Row k="rent_late" title="Loyer en retard" desc="Quand un loyer dépasse sa date d'échéance." />
          <Row k="rent_partial" title="Paiement partiel" desc="Quand un paiement partiel est enregistré." />
          <Row k="rent_paid" title="Loyer encaissé" desc="Quand un loyer est intégralement payé." />
        </CardContent>
      </Card>
    </div>
  );
}
