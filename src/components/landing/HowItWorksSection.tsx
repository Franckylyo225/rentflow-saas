import { Building2, Users, BarChart3, ArrowRight } from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";

const STEPS = [
  {
    number: "01",
    title: "Ajoutez vos biens",
    description:
      "Enregistrez vos immeubles, villas et unités locatives en quelques clics. Importez vos données existantes via Excel.",
    icon: Building2,
    color: "primary",
  },
  {
    number: "02",
    title: "Gérez vos locataires",
    description:
      "Créez les fiches locataires, générez les échéances automatiquement et suivez les paiements en temps réel.",
    icon: Users,
    color: "primary",
  },
  {
    number: "03",
    title: "Pilotez votre activité",
    description:
      "Consultez vos revenus, dépenses et taux d'occupation depuis un tableau de bord clair et actionnable.",
    icon: BarChart3,
    color: "primary",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 sm:py-32 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
            Simple & rapide
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Comment ça marche ?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Trois étapes suffisent pour digitaliser votre gestion locative
          </p>
        </AnimatedSection>

        <StaggerContainer staggerDelay={0.15} className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {STEPS.map((step, index) => (
            <StaggerItem key={step.number}>
              <div className="relative group h-full">
                {/* Connector arrow — hidden on last card and on mobile */}
                {index < STEPS.length - 1 && (
                  <div className="hidden md:flex absolute -right-5 lg:-right-5 top-1/3 z-10 text-muted-foreground/30">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                )}

                <div className="rounded-3xl border border-border bg-background p-8 sm:p-10 h-full transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5">
                  {/* Step number */}
                  <span className="text-5xl font-black text-primary/15 select-none leading-none">
                    {step.number}
                  </span>

                  {/* Icon */}
                  <div className="mt-5 mb-5 inline-flex items-center justify-center p-3.5 rounded-2xl bg-primary/10 text-primary">
                    <step.icon className="h-6 w-6" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
                    {step.description}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
