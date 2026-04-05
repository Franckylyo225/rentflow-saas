import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Users, CreditCard } from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";

export function HeroSection() {
  return (
    <section className="relative pt-36 pb-24 sm:pt-44 sm:pb-32 overflow-hidden">
      {/* Scrunch-style organic blob backgrounds */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] landing-blob rounded-full" />
        <div className="absolute top-1/2 -left-48 w-[400px] h-[400px] landing-blob rounded-full opacity-60" />
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="max-w-3xl">
          <AnimatedSection delay={0}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.05]">
              Gérez vos biens immobiliers{" "}
              <span className="relative inline-block">
                <span className="relative z-10">simplement</span>
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-secondary rounded-full -z-0" />
              </span>
            </h1>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <p className="mt-7 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
              Centralisez la gestion de vos propriétés, locataires et loyers sur une seule plateforme. Automatisez les relances et gardez le contrôle total.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
              <Button
                size="lg"
                className="gap-2 text-base px-8 h-13 rounded-full font-semibold shadow-none"
                asChild
              >
                <Link to="/auth">
                  Commencer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 h-13 rounded-full font-medium bg-card border-border shadow-none"
                asChild
              >
                <a href="#features">Voir les fonctionnalités</a>
              </Button>
            </div>

            <div className="mt-5 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="text-primary">✓</span> 14 jours d'essai gratuit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-primary">✓</span> Aucune carte requise
              </span>
            </div>
          </AnimatedSection>
        </div>

        {/* Stats bar — pill-style cards */}
        <StaggerContainer className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl" staggerDelay={0.12}>
          {[
            { icon: Building2, value: "500+", label: "Propriétés gérées" },
            { icon: Users, value: "2 000+", label: "Locataires suivis" },
            { icon: CreditCard, value: "99,5%", label: "Taux de recouvrement" },
          ].map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-card border border-border">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground leading-none">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
