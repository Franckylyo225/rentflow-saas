import { ArrowRight } from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import salesImg from "@/assets/real-estate-sales.jpg";

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

          {/* Right — image */}
          <AnimatedSection direction="right">
            <img
              src={salesImg}
              alt="Interface de gestion de vente immobilière RentFlow"
              className="w-full rounded-2xl shadow-xl border border-border"
              loading="lazy"
              width={1024}
              height={768}
            />
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}