import { MapPin, TrendingUp, Users, FileCheck, ArrowRight } from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const SALES_FEATURES = [
  {
    icon: MapPin,
    title: "Catalogue de biens",
    description: "Gérez votre portefeuille de terrains, maisons et appartements à vendre avec fiches détaillées et photos.",
  },
  {
    icon: Users,
    title: "Suivi des prospects",
    description: "Centralisez vos contacts acheteurs, suivez les visites et relancez au bon moment.",
  },
  {
    icon: TrendingUp,
    title: "Pipeline de ventes",
    description: "Visualisez chaque étape de la transaction : prospection, négociation, compromis, acte notarié.",
  },
  {
    icon: FileCheck,
    title: "Documents & conformité",
    description: "Titres fonciers, mandats de vente, compromis : tous vos documents centralisés et accessibles.",
  },
];

export function RealEstateSalesSection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 sm:py-32 bg-muted/30">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — text */}
          <AnimatedSection direction="left">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
              Nouveau
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
              Vente immobilière
            </h2>
            <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
              Agences, promoteurs, lotisseurs : gérez la commercialisation de vos terrains, maisons et appartements.
              Suivez chaque prospect, chaque offre et chaque signature depuis une seule plateforme.
            </p>
            <Button
              size="lg"
              className="mt-8 rounded-xl"
              onClick={() => navigate("/auth")}
            >
              Découvrir la vente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </AnimatedSection>

          {/* Right — feature cards */}
          <StaggerContainer className="grid sm:grid-cols-2 gap-4" staggerDelay={0.08}>
            {SALES_FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <div className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-md transition-all duration-300 h-full">
                  <div className="p-2.5 rounded-xl bg-primary/8 w-fit mb-4">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
