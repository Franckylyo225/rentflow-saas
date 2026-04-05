import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedSection } from "./AnimatedSection";

export function CtaSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="relative rounded-3xl bg-primary p-10 sm:p-16 text-center overflow-hidden">
            {/* Decorative shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary-foreground/5 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-primary-foreground/5 translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
                Prêt à simplifier votre gestion locative ?
              </h2>
              <p className="mt-4 text-primary-foreground/80 text-lg max-w-xl mx-auto">
                Rejoignez des centaines de gestionnaires qui gagnent du temps et augmentent
                leurs revenus grâce à notre plateforme.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 text-base px-8 h-12 w-full sm:w-auto"
                  asChild
                >
                  <Link to="/auth">
                    Démarrer l'essai gratuit
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-primary-foreground/60">
                14 jours gratuits · Aucune carte requise · Annulez à tout moment
              </p>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
