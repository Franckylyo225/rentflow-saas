import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Clock } from "lucide-react";
import { useEarlyAdopterConfig } from "@/hooks/useEarlyAdopterStatus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EarlyAdopterCTA() {
  const { config, loading } = useEarlyAdopterConfig();
  const initialRemaining = config ? Math.max(0, config.total_slots - config.slots_taken) : 0;
  const [liveRemaining, setLiveRemaining] = useState<number>(initialRemaining);

  useEffect(() => { setLiveRemaining(initialRemaining); }, [initialRemaining]);

  // Décrémenteur live (40% de probabilité toutes les 15s, s'arrête à 1)
  useEffect(() => {
    if (!config?.active) return;
    const id = setInterval(() => {
      setLiveRemaining((cur) => (cur > 1 && Math.random() < 0.4 ? cur - 1 : cur));
    }, 15000);
    return () => clearInterval(id);
  }, [config?.active]);

  const lastFive = useMemo(() => {
    // Avatars simulés (initiales aléatoires) — pas de PII exposée
    const seed = ["AB", "MK", "FJ", "OS", "ND"];
    return seed;
  }, []);

  if (loading || !config) return null;
  if (!config.active || initialRemaining <= 0) return null;

  const slotsTakenLive = config.total_slots - liveRemaining;
  const fillPct = Math.min(100, Math.round((slotsTakenLive / Math.max(1, config.total_slots)) * 100));
  const daysEstimate = Math.max(1, Math.round(liveRemaining / 5));
  const moreCount = Math.max(0, slotsTakenLive - 5);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="rounded-3xl overflow-hidden border border-border shadow-xl">
          {/* Header sombre */}
          <div className="bg-[#0F2942] text-white p-8 md:p-12 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-xs font-medium">Offre de lancement</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Rejoignez les pionniers de la gestion locative digitale</h2>
            <p className="text-white/80 text-base md:text-lg">
              Réduction garantie à vie · Accès anticipé · {config.free_months} mois offerts
            </p>
          </div>

          {/* Body */}
          <div className="bg-white p-6 md:p-10 space-y-8">
            {/* Compteur */}
            <div className="bg-[#0F2942] rounded-2xl p-6 md:p-8 text-white text-center">
              <p className="text-7xl md:text-8xl font-extrabold text-[#A3E635] tabular-nums">{liveRemaining}</p>
              <p className="text-white/70 mt-2">sur {config.total_slots} places</p>
              <div className="h-2 bg-white/10 rounded-full mt-5 overflow-hidden max-w-md mx-auto">
                <div className="h-full bg-success rounded-full transition-all duration-700" style={{ width: `${fillPct}%` }} />
              </div>
              <p className="text-xs text-white/60 mt-2">{fillPct}% rempli</p>
            </div>

            {/* Urgence */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-700 shrink-0" />
              <p className="text-sm text-yellow-900">
                À ce rythme, les places seront épuisées dans <strong>~{daysEstimate} jour{daysEstimate > 1 ? "s" : ""}</strong>
              </p>
            </div>

            {/* 4 avantages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                `−${config.discount_percent}% à vie garanti`,
                `${config.free_months} mois offerts`,
                "Accès bêta fonctionnalités",
                "Support prioritaire",
              ].map((label) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-border p-4 bg-card">
                  <Sparkles className="h-5 w-5 text-success" />
                  <p className="font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* Mise en avant -X% à vie */}
            <div className="text-center">
              <p className="text-6xl md:text-7xl font-extrabold text-success leading-none">
                −{config.discount_percent}%
              </p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-2">
                à vie, garanti
              </p>
              <p className="text-muted-foreground mt-2">
                Bloquez ce tarif préférentiel pour toujours, sans augmentation
              </p>
            </div>

            {/* Avatars + compteur */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {lastFive.map((init, i) => (
                  <div key={i} className="h-9 w-9 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-xs font-bold text-primary">
                    {init}
                  </div>
                ))}
              </div>
              {moreCount > 0 && (
                <p className="text-sm text-muted-foreground">+{moreCount} déjà inscrits</p>
              )}
            </div>

            {/* CTA */}
            <div className="text-center space-y-3">
              <Button asChild size="lg" className="bg-success hover:bg-success/90 text-success-foreground rounded-full px-8 py-6 text-base">
                <Link to="/auth?ref=early_adopter">Rejoindre l'offre Early Adopter</Link>
              </Button>
              <p className="text-xs text-muted-foreground">Sans carte bancaire · Orange Money accepté · Annulez à tout moment</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
