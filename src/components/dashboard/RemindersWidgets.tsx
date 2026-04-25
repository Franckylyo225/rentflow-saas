import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Mail, Smartphone, Calendar as CalendarIcon, ArrowRight, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTenants } from "@/hooks/useData";
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
import { toast } from "sonner";

export function RemindersWidgets() {
  const navigate = useNavigate();
  const { data: tenants } = useTenants();
  const [active, setActive] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Simulated upcoming reminders
  const upcomingReminders = useMemo(() => {
    const sample = tenants.slice(0, 3);
    const now = new Date();
    const fmt = (h: number, m: number) => {
      const d = new Date(now); d.setHours(h, m); return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    };
    return sample.map((t, i) => ({
      channel: i % 2 === 0 ? "email" as const : "sms" as const,
      name: t.full_name,
      time: fmt(9 + i * 2, 0),
      reason: i === 0 ? "Loyer J-5" : i === 1 ? "Loyer en retard" : "Renouvellement",
    }));
  }, [tenants]);

  // Simulated upcoming events
  const events = useMemo(() => {
    const out: { date: string; label: string; target: string }[] = [];
    const today = new Date();
    tenants.slice(0, 4).forEach((t, i) => {
      if (!t.lease_start || !t.lease_duration) return;
      const start = new Date(t.lease_start);
      const end = new Date(start);
      end.setMonth(end.getMonth() + t.lease_duration);
      out.push({
        date: end.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        label: i === 0 ? "Fin bail" : i === 1 ? "Visite" : i === 2 ? "Renouvellement" : "Échéance",
        target: t.units?.properties?.name || t.units?.name || t.full_name,
      });
    });
    if (out.length === 0) {
      const d = new Date(today); d.setDate(d.getDate() + 7);
      out.push({ date: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), label: "Aucun événement", target: "—" });
    }
    return out.slice(0, 4);
  }, [tenants]);

  function handleToggle(next: boolean) {
    if (!next) {
      setConfirmOpen(true);
    } else {
      setActive(true);
      toast.success("Relances automatiques activées");
    }
  }

  function confirmDeactivation() {
    setActive(false);
    setConfirmOpen(false);
    toast.warning("Relances automatiques désactivées");
  }

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Relances automatiques
            </CardTitle>
            <Switch checked={active} onCheckedChange={handleToggle} />
          </div>
          <p className="text-xs text-muted-foreground">
            État : <span className={active ? "text-success font-semibold" : "text-muted-foreground"}>{active ? "Actives" : "Désactivées"}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {active ? (
            <>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Prochaines relances</p>
              <ul className="space-y-1.5">
                {upcomingReminders.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    {r.channel === "email" ? <Mail className="h-3.5 w-3.5 text-info mt-0.5 flex-shrink-0" /> : <Smartphone className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-card-foreground truncate">{r.name}</p>
                      <p className="text-muted-foreground truncate">{r.time} · {r.reason}</p>
                    </div>
                  </li>
                ))}
                {upcomingReminders.length === 0 && (
                  <li className="text-xs text-muted-foreground italic">Aucune relance programmée</li>
                )}
              </ul>
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucune relance ne sera envoyée.</p>
          )}
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1 mt-2" onClick={() => navigate("/settings?tab=notifications")}>
            Gérer les séquences <ArrowRight className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" /> Prochaines échéances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="space-y-1.5">
            {events.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className="text-base">📅</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-card-foreground"><span className="text-muted-foreground">{e.date}</span> — {e.label}</p>
                  <p className="text-muted-foreground truncate">{e.target}</p>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1 mt-2" onClick={() => navigate("/notifications")}>
            Voir calendrier <ArrowRight className="h-3 w-3" />
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Statistiques relances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Ouverture email</span>
              <span className="font-bold text-card-foreground">68%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-info" style={{ width: "68%" }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Réponse SMS</span>
              <span className="font-bold text-card-foreground">42%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-success" style={{ width: "42%" }} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground italic">Mois en cours</p>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver les relances ?</AlertDialogTitle>
            <AlertDialogDescription>
              {upcomingReminders.length} relance(s) programmée(s) seront annulées. Confirmer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivation}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
