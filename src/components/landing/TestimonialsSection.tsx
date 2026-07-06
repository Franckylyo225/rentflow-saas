import { Star } from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";

const TESTIMONIALS = [
  {
    name: "Amadou Diallo",
    role: "Directeur, Groupe Immobilier Diallo",
    location: "Abidjan, Côte d'Ivoire",
    content:
      "Depuis que nous utilisons cette plateforme, notre taux de recouvrement est passé de 78% à 97%. Les relances automatiques ont tout changé.",
    rating: 5,
    initials: "AD",
  },
  {
    name: "Fatou Ndiaye",
    role: "Gérante, SCI Les Palmiers",
    location: "Dakar, Sénégal",
    content:
      "L'interface est intuitive et les rapports financiers me donnent une vue claire sur tous mes biens. Je recommande à 100%.",
    rating: 5,
    initials: "FN",
  },
  {
    name: "Jean-Paul Mbeki",
    role: "Promoteur immobilier",
    location: "Kinshasa, RDC",
    content:
      "La gestion multi-villes est un atout majeur. Je gère 200 unités réparties sur 3 villes depuis mon téléphone. Impressionnant.",
    rating: 5,
    initials: "JPM",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 sm:py-32 relative overflow-hidden">
      {/* Blob */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] landing-blob rounded-full -z-10 opacity-30" />

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block px-3 py-1 rounded-full bg-secondary text-xs font-semibold text-primary uppercase tracking-widest border border-border/50 mb-4">
            Témoignages
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Ils nous font <span className="text-primary">confiance</span>
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Des gestionnaires immobiliers à travers l'Afrique utilisent notre plateforme au quotidien.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6" staggerDelay={0.12}>
          {TESTIMONIALS.map((t, i) => (
            <StaggerItem key={t.name}>
              <div
                className={`group flex flex-col p-8 rounded-3xl bg-card border border-border h-full shadow-[var(--shadow-elevated)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[var(--shadow-card-hover)] ${
                  i === 1 ? "md:translate-y-4" : ""
                }`}
              >
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: t.rating }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>

                <blockquote className="text-foreground leading-relaxed font-medium flex-1">
                  « {t.content} »
                </blockquote>

                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm tracking-tight">
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.role} · {t.location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
