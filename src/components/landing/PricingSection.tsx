import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";

const PLANS = [
  {
    name: "Starter",
    description: "Pour les petits propriétaires",
    price: "9 900",
    period: "/mois",
    features: [
      "Jusqu'à 10 unités",
      "1 utilisateur",
      "Suivi des loyers",
      "Quittances PDF",
      "Relances email",
      "Support par email",
    ],
    cta: "Commencer l'essai",
    popular: false,
  },
  {
    name: "Pro",
    description: "Pour les agences immobilières",
    price: "29 900",
    period: "/mois",
    features: [
      "Jusqu'à 100 unités",
      "5 utilisateurs",
      "Tout le plan Starter",
      "Relances SMS",
      "Rapports financiers",
      "Gestion du patrimoine",
      "Multi-villes",
      "Support prioritaire",
    ],
    cta: "Commencer l'essai",
    popular: true,
  },
  {
    name: "Entreprise",
    description: "Pour les grandes sociétés",
    price: "Sur mesure",
    period: "",
    features: [
      "Unités illimitées",
      "Utilisateurs illimités",
      "Tout le plan Pro",
      "Multi-pays",
      "API & intégrations",
      "SLA garanti",
      "Account manager dédié",
      "Formation sur site",
    ],
    cta: "Nous contacter",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Tarifs
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Des tarifs adaptés à votre activité
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            14 jours d'essai gratuit sur tous les plans. Aucune carte requise.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto" staggerDelay={0.15}>
          {PLANS.map((plan) => (
            <StaggerItem key={plan.name}>
              <div
                className={`relative flex flex-col rounded-2xl border p-8 h-full ${
                  plan.popular
                    ? "border-primary bg-card shadow-lg scale-[1.02]"
                    : "border-border bg-card"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4">
                    Le plus populaire
                  </Badge>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-foreground">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-muted-foreground ml-1">
                      FCFA{plan.period}
                    </span>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  asChild
                >
                  <Link to="/auth">{plan.cta}</Link>
                </Button>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
