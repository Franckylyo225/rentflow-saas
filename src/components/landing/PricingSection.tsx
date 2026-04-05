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
    <section id="pricing" className="py-24 sm:py-32 relative overflow-hidden">
      {/* Blob background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] landing-blob rounded-full -z-10 opacity-40" />

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
            Tarifs
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Des tarifs adaptés à votre activité
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            14 jours d'essai gratuit sur tous les plans. Aucune carte requise.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl mx-auto" staggerDelay={0.12}>
          {PLANS.map((plan) => (
            <StaggerItem key={plan.name}>
              <div
                className={`relative flex flex-col rounded-3xl border p-8 h-full transition-shadow duration-300 ${
                  plan.popular
                    ? "border-primary bg-card shadow-lg"
                    : "border-border bg-card hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-5 py-1 rounded-full text-xs font-semibold">
                    Le plus populaire
                  </Badge>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-extrabold text-foreground tracking-tight">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-muted-foreground ml-1 text-sm">
                      FCFA{plan.period}
                    </span>
                  )}
                </div>

                <ul className="space-y-3.5 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 p-0.5 rounded-full bg-primary/10">
                        <Check className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full rounded-full font-semibold ${plan.popular ? "" : ""}`}
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
