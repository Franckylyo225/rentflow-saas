import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedSection } from "./AnimatedSection";

export function CtaSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection>
          <div className="relative rounded-[2.5rem] p-10 sm:p-16 lg:p-20 text-center overflow-hidden bg-foreground">
            {/* Decorative shapes */}
            <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary/25 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-6 border border-primary/30">
                <Sparkles className="h-3.5 w-3.5" />
                Offre Early Adopter · -25% pendant 3 mois
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-background tracking-tight leading-tight">
                Prêt à transformer votre gestion locative ?
              </h2>
              <p className="mt-5 text-background/70 text-lg leading-relaxed">
                Rejoignez les agences et propriétaires qui sécurisent leurs revenus locatifs
                grâce à Rentflow. Commencez gratuitement en moins de 2 minutes.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  size="lg"
                  className="gap-2 text-base px-10 h-14 rounded-2xl font-semibold shadow-xl shadow-primary/30"
                  asChild
                >
                  <Link to="/auth">
                    Créer mon compte gratuit
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-14 rounded-2xl font-medium bg-transparent border-background/20 text-background hover:bg-background/10 hover:text-background"
                  asChild
                >
                  <Link to="/contact">Parler à un conseiller</Link>
                </Button>
              </div>
              <p className="mt-5 text-xs text-background/50">
                7 jours d'essai · Sans carte bancaire · Annulez à tout moment
              </p>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
