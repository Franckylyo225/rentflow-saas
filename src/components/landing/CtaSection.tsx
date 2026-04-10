import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedSection } from "./AnimatedSection";
import ctaBg from "@/assets/cta-bg.jpg";

export function CtaSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection>
          <div className="relative rounded-[2rem] p-12 sm:p-20 text-center overflow-hidden">
            {/* Background image */}
            <div className="absolute inset-0 z-0">
              <img src={ctaBg} alt="" className="w-full h-full object-cover" />
            </div>
            {/* Dark overlay with gradient */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-br from-foreground/85 via-foreground/75 to-primary/60" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-background tracking-tight">
                Prêt à simplifier votre gestion locative ?
              </h2>
              <p className="mt-5 text-background/60 text-lg max-w-xl mx-auto leading-relaxed">
                Rejoignez des centaines de gestionnaires qui gagnent du temps et augmentent
                leurs revenus grâce à notre plateforme.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="gap-2 text-base px-8 h-14 rounded-2xl font-semibold shadow-lg shadow-primary/20"
                  asChild
                >
                  <Link to="/auth">
                    Démarrer l'essai gratuit
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="mt-5 text-xs text-background/40">
                14 jours gratuits · Aucune carte requise · Annulez à tout moment
              </p>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
