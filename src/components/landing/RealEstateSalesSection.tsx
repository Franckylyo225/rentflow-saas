import { ArrowRight, Building2, FileSignature, Users, TrendingUp } from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import salesImg from "@/assets/real-estate-sales.jpg";

const SALES_FEATURES = [
  {
    icon: Building2,
    title: "Catalogue de biens",
    description: "Terrains, maisons, appartements — centralisés avec photos, plans et statuts en temps réel.",
  },
  {
    icon: Users,
    title: "Suivi des prospects",
    description: "Pipeline clair du premier contact à la signature, avec relances automatiques SMS et email.",
  },
  {
    icon: FileSignature,
    title: "Offres & contrats",
    description: "Générez promesses de vente et contrats OHADA en quelques clics, signature suivie de bout en bout.",
  },
  {
    icon: TrendingUp,
    title: "Commissions & reporting",
    description: "Calcul automatique des commissions agents, tableaux de bord ventes et prévisions de trésorerie.",
  },
];

export function RealEstateSalesSection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — visual */}
          <AnimatedSection direction="left" className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-primary/10 blur-3xl" />
              <div className="relative rounded-[2rem] overflow-hidden border border-border/60 bg-card shadow-xl">
                <img
                  src={salesImg}
                  alt="Interface de gestion de vente immobilière Rentflow"
                  className="w-full h-auto"
                  loading="lazy"
                  width={1024}
                  height={768}
                />
              </div>
              {/* Floating stat card */}
              <div className="hidden sm:block absolute -bottom-6 -right-6 bg-card border border-border/60 rounded-2xl shadow-lg p-5 w-56">
                <p className="font-display text-3xl font-bold text-primary tracking-tight leading-none">+38%</p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  de biens vendus en moyenne dès les 3 premiers mois.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Right — text & features */}
          <AnimatedSection direction="right" className="order-1 lg:order-2">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
              Nouveau · Module Vente
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
              Vendez plus vite, en gardant chaque dossier sous contrôle
            </h2>
            <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
              Agences, promoteurs et lotisseurs : pilotez la commercialisation de vos terrains, maisons et
              appartements depuis la même plateforme que votre gestion locative.
            </p>

            <StaggerContainer className="mt-8 grid sm:grid-cols-2 gap-4" staggerDelay={0.08}>
              {SALES_FEATURES.map((f) => (
                <StaggerItem key={f.title}>
                  <div className="h-full p-5 rounded-2xl bg-secondary/60 border border-border/50">
                    <div className="p-2.5 rounded-xl bg-card w-fit mb-3 border border-border/60">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-display text-base font-bold text-foreground mb-1 tracking-tight">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>

            <Button
              size="lg"
              className="mt-8 rounded-full"
              onClick={() => navigate("/auth")}
            >
              Découvrir le module Vente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
