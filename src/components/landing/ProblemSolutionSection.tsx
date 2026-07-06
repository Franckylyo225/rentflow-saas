import { Coins, MessageSquare, ScrollText, Users2 } from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";

const REASONS = [
  {
    icon: Coins,
    title: "100 % FCFA",
    description:
      "Tarifs, loyers, quittances et rapports nativement en Francs CFA. Pas de conversion, pas de mauvaise surprise.",
  },
  {
    icon: MessageSquare,
    title: "SMS local intégré",
    description:
      "Relances envoyées via SMS depuis un numéro local. Vos locataires reçoivent et répondent vraiment.",
  },
  {
    icon: ScrollText,
    title: "Conforme OHADA",
    description:
      "Modèles de bail, quittances et documents alignés sur les textes en vigueur en Afrique de l'Ouest.",
  },
  {
    icon: Users2,
    title: "Multi-agents & multi-agences",
    description:
      "Admin, gestionnaire, comptable, propriétaire — chacun ses droits, chacun son tableau de bord.",
  },
];

export function ProblemSolutionSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
            Pourquoi Rentflow
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Pensé pour les gestionnaires d'Afrique de l'Ouest
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Là où les outils européens s'arrêtent, Rentflow commence : monnaie locale, canaux locaux,
            législation locale, et un support qui parle votre langue.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" staggerDelay={0.08}>
          {REASONS.map((r) => (
            <StaggerItem key={r.title}>
              <div className="h-full p-7 rounded-3xl bg-secondary/60 border border-border/50 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
                <div className="relative">
                  <div className="p-3 rounded-2xl bg-card w-fit mb-5 border border-border/60">
                    <r.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2 tracking-tight">
                    {r.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Stats strip */}
        <AnimatedSection delay={0.3}>
          <div className="mt-16 rounded-[2rem] bg-foreground text-background p-8 sm:p-12 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { value: "500+", label: "biens gérés" },
                { value: "98%", label: "taux de recouvrement" },
                { value: "4 h", label: "économisées / semaine" },
                { value: "12", label: "villes couvertes" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-display text-4xl sm:text-5xl font-bold text-primary tracking-tight leading-none">
                    {s.value}
                  </p>
                  <p className="mt-2 text-sm text-background/70">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
