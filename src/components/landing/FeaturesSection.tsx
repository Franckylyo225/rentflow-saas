import {
  Building2,
  Users,
  CreditCard,
  Bell,
  BarChart3,
  FileText,
} from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";

const FEATURES = [
  {
    icon: Building2,
    title: "Gestion des biens",
    description:
      "Centralisez tous vos immeubles, villas et unités locatives. Suivez l'occupation en temps réel.",
  },
  {
    icon: Users,
    title: "Gestion des locataires",
    description:
      "Fiches locataires complètes, contrats, historiques de paiement et scoring de risque automatique.",
  },
  {
    icon: CreditCard,
    title: "Suivi des loyers",
    description:
      "Encaissements, paiements partiels, quittances automatiques. Tout en un clic.",
  },
  {
    icon: Bell,
    title: "Relances automatiques",
    description:
      "Rappels par email avant et après l'échéance. Plus de loyers oubliés.",
  },
  {
    icon: BarChart3,
    title: "Rapports financiers",
    description:
      "Tableau de bord avec revenus, dépenses, taux d'occupation et analyse comparative.",
  },
  {
    icon: FileText,
    title: "Documents & patrimoine",
    description:
      "Gestion de vos titres fonciers, documents juridiques et patrimoine immobilier.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
            Fonctionnalités
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Tout ce qu'il faut pour gérer vos biens
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Une suite complète d'outils conçue pour les gestionnaires immobiliers africains.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" staggerDelay={0.06}>
          {FEATURES.map((feature) => (
            <StaggerItem key={feature.title}>
              <div className="group p-7 rounded-3xl bg-card border border-border hover:border-primary/20 hover:shadow-md transition-all duration-300 h-full">
                <div className="p-3 rounded-2xl bg-primary/8 w-fit mb-5 group-hover:bg-primary/12 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
