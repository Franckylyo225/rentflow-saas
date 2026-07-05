import {
  Building2,
  Users,
  CreditCard,
  Bell,
  BarChart3,
  FileText,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";

const FEATURES = [
  {
    icon: Building2,
    title: "Gestion des biens",
    description: "Immeubles, villas, studios, commerces. Suivi de l'occupation en temps réel, multi-villes, multi-agences.",
  },
  {
    icon: Users,
    title: "Fiches locataires",
    description: "Contrats OHADA, pièces d'identité, cautions, historiques et scoring de risque automatique.",
  },
  {
    icon: CreditCard,
    title: "Loyers & quittances",
    description: "Encaissements complets ou partiels, quittances PDF générées automatiquement dès réception.",
  },
  {
    icon: MessageSquare,
    title: "Relances SMS & e-mail",
    description: "Rappels avant échéance et relances de retard via MonSMS Pro. Réduisez vos impayés de 40%.",
  },
  {
    icon: BarChart3,
    title: "Comptabilité & rapports",
    description: "Tableau de bord des revenus, dépenses, taux d'occupation et analyse comparative en FCFA.",
  },
  {
    icon: FileText,
    title: "Documents & patrimoine",
    description: "Titres fonciers, baux, états des lieux et pièces juridiques stockés en sécurité.",
  },
  {
    icon: Bell,
    title: "Notifications intelligentes",
    description: "Loyers en retard, contrats à renouveler, quittances envoyées — vous ne ratez plus rien.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-utilisateurs sécurisé",
    description: "Rôles admin, gestionnaire, comptable. Chaque équipe voit ce qu'elle doit voir.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
            La solution Rentflow
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Tout ce qu'il faut pour gérer vos biens
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Rentflow automatise ce qui vous prenait du temps : loyers, quittances, contrats, rappels.
            Chaque mois, vos documents sont générés de manière fiable, conforme et sans effort manuel.
          </p>
        </AnimatedSection>

        <StaggerContainer
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
          staggerDelay={0.05}
        >
          {FEATURES.map((feature) => (
            <StaggerItem key={feature.title}>
              <div className="group h-full p-6 rounded-3xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <div className="p-2.5 rounded-2xl bg-primary/10 w-fit mb-5 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2 tracking-tight">
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
