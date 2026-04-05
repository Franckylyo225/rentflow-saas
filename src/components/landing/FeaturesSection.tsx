import {
  Building2,
  Users,
  CreditCard,
  Bell,
  BarChart3,
  Shield,
  Globe,
  FileText,
  Smartphone,
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
      "Rappels par SMS et email avant et après l'échéance. Plus de loyers oubliés.",
  },
  {
    icon: BarChart3,
    title: "Rapports financiers",
    description:
      "Tableau de bord avec revenus, dépenses, taux d'occupation et analyse comparative.",
  },
  {
    icon: Shield,
    title: "Sécurité & multi-tenant",
    description:
      "Isolation des données par entreprise, contrôle d'accès par rôle et chiffrement.",
  },
  {
    icon: Globe,
    title: "Multi-pays",
    description:
      "Support multi-devises, multi-villes et multi-pays pour accompagner votre croissance.",
  },
  {
    icon: FileText,
    title: "Documents & patrimoine",
    description:
      "Gestion de vos titres fonciers, documents juridiques et patrimoine immobilier.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first",
    description:
      "Interface responsive optimisée pour une gestion efficace depuis n'importe quel appareil.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Fonctionnalités
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Tout ce qu'il faut pour gérer vos biens
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Une suite complète d'outils conçue pour les gestionnaires immobiliers africains.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
          {FEATURES.map((feature) => (
            <StaggerItem key={feature.title}>
              <div className="group p-6 rounded-2xl border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all duration-300 h-full">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
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
