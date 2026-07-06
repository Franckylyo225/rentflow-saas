import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Bell, CheckCircle2, Circle } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
      {/* Soft blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-[420px] h-[420px] rounded-full bg-accent/50 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
          {/* Left — copy */}
          <div>
            <AnimatedSection delay={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-[13px] font-medium text-accent-foreground border border-primary/15 mb-7">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="font-semibold text-primary">+180</span>
                <span className="text-foreground/70">agences inscrites ce trimestre en Afrique de l'Ouest</span>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.08}>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.02] text-foreground">
                Gérez vos locations{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-primary">en toute simplicité</span>
                  <span className="absolute inset-x-0 bottom-1 h-3 bg-primary/15 -z-0 rounded-sm" />
                </span>
                .
              </h1>
            </AnimatedSection>

            <AnimatedSection delay={0.16}>
              <p className="mt-7 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
                Le premier logiciel de gestion locative pensé pour le marché ouest-africain.
                Loyers, quittances, relances SMS et comptabilité — tout est automatisé.
              </p>
            </AnimatedSection>

            <AnimatedSection delay={0.24}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="gap-2 text-base px-8 h-14 rounded-2xl font-semibold shadow-lg shadow-primary/25"
                  asChild
                >
                  <Link to="/auth">
                    Ouvrir un compte gratuit
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 h-14 rounded-2xl font-medium bg-card border-border/60 hover:border-primary/40"
                  asChild
                >
                  <a href="#how-it-works">Voir la démo</a>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                7 jours gratuits · Sans carte bancaire · Support en français
              </p>
            </AnimatedSection>

            {/* Trust indicators */}
            <AnimatedSection delay={0.36}>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {["AD", "FN", "JM", "KT", "SA"].map((initials, i) => (
                      <div
                        key={initials}
                        className="h-9 w-9 rounded-full border-2 border-background bg-accent text-accent-foreground flex items-center justify-center text-[10px] font-bold"
                        style={{ zIndex: 5 - i }}
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground leading-tight">500+ biens gérés</p>
                    <p className="text-muted-foreground text-xs">Abidjan · Dakar · Bamako</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-border hidden sm:block" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground leading-tight">98% recouvrement</p>
                  <p className="text-muted-foreground text-xs">grâce aux relances SMS auto</p>
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* Right — dashboard mockup */}
          <AnimatedSection direction="right" delay={0.15}>
            <div className="relative">
              {/* Main card */}
              <div className="relative bg-card border border-border/60 rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-foreground/5">
                <div className="flex items-center justify-between mb-6">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Encaissements du mois</p>
                    <p className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                      4 850 000 <span className="text-lg text-muted-foreground font-semibold">FCFA</span>
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>

                {/* Rows */}
                <div className="space-y-2.5">
                  {[
                    { name: "Villa Cocody — M. Traoré", amount: "450 000", state: "paid" },
                    { name: "Appt Plateau B12 — Mme Diallo", amount: "220 000", state: "paid" },
                    { name: "Studio Marcory — K. Kone", amount: "125 000", state: "late" },
                    { name: "Duplex Riviera — SCI Binieba", amount: "780 000", state: "pending" },
                  ].map((r) => (
                    <div
                      key={r.name}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/60 border border-border/40"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {r.state === "paid" ? (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        ) : r.state === "late" ? (
                          <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-foreground">{r.amount}</span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            r.state === "paid"
                              ? "bg-primary/15 text-primary"
                              : r.state === "late"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-warning/15 text-warning"
                          }`}
                        >
                          {r.state === "paid" ? "Payé" : r.state === "late" ? "Retard" : "À venir"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating SMS card */}
              <motion.div
                initial={{ opacity: 0, x: 20, y: 20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.7, delay: 0.6 }}
                className="hidden sm:flex absolute -bottom-6 -left-6 bg-foreground text-background rounded-2xl p-4 shadow-xl w-64 items-start gap-3"
              >
                <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-background/50 font-semibold">SMS envoyé</p>
                  <p className="text-sm font-medium leading-snug mt-0.5">
                    Rappel loyer envoyé à <span className="text-primary">K. Kone</span> · 09:02
                  </p>
                </div>
              </motion.div>

              {/* Floating occupancy chip */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.75 }}
                className="hidden sm:block absolute -top-5 -right-4 bg-card border border-border/60 rounded-2xl px-4 py-3 shadow-lg"
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Taux d'occupation</p>
                <p className="font-display text-2xl font-bold text-primary leading-none mt-1">97%</p>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
