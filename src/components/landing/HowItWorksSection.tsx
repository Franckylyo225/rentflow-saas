import { Building2, Users, Wallet, ArrowRight } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";

const STEPS = [
  {
    number: "01",
    title: "Ajoutez vos biens",
    description:
      "Enregistrez immeubles, villas, studios ou commerces en quelques clics. Importez vos données existantes via Excel.",
    icon: Building2,
    accent: [
      { label: "Villa Cocody", meta: "3 unités · 750 000 FCFA / mois" },
      { label: "Immeuble Plateau", meta: "12 unités · Occupation 92%" },
    ],
  },
  {
    number: "02",
    title: "Enregistrez vos locataires",
    description:
      "Fiches locataires complètes, contrats de bail conformes OHADA, pièces d'identité et historiques centralisés.",
    icon: Users,
    accent: [
      { label: "M. Traoré Moussa", meta: "Bail 2 ans · Caution 900 000 FCFA" },
      { label: "Mme Diallo Awa", meta: "Bail 1 an · Paiement à jour" },
    ],
  },
  {
    number: "03",
    title: "Encaissez et relancez",
    description:
      "Quittances générées automatiquement, rappels par SMS et e-mail avant l'échéance. Recouvrement quasi total, sans stress.",
    icon: Wallet,
    accent: [
      { label: "Quittance PDF · Mai 2026", meta: "Envoyée par e-mail" },
      { label: "SMS rappel · J-5", meta: "Envoyé à 3 locataires" },
    ],
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-secondary/40 border-y border-border/50">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
            Un fonctionnement simple
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Comment ça marche ?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            Simple comme 1, 2, 3. Prenez la main sur votre patrimoine en moins de 5 minutes.
          </p>
        </AnimatedSection>

        <div className="space-y-12 sm:space-y-16">
          {STEPS.map((step, idx) => (
            <AnimatedSection key={step.number} delay={idx * 0.1}>
              <div
                className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
                  idx % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* Text */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <span className="font-display text-6xl sm:text-7xl font-bold text-primary/25 leading-none select-none">
                      {step.number}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
                  </div>
                  <div className="inline-flex items-center gap-2 p-2.5 rounded-2xl bg-primary/10 text-primary mb-5">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{step.description}</p>
                </div>

                {/* Mock card */}
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/5 rounded-[2rem] blur-2xl" />
                  <div className="relative bg-card border border-border/60 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-foreground/5">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                        <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                        <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Étape {step.number}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {step.accent.map((a) => (
                        <div
                          key={a.label}
                          className="flex items-center justify-between gap-3 p-4 rounded-xl bg-secondary/60 border border-border/40"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{a.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.meta}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
