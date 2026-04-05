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
  },
  {
    name: "Fatou Ndiaye",
    role: "Gérante, SCI Les Palmiers",
    location: "Dakar, Sénégal",
    content:
      "L'interface est intuitive et les rapports financiers me donnent une vue claire sur tous mes biens. Je recommande à 100%.",
    rating: 5,
  },
  {
    name: "Jean-Paul Mbeki",
    role: "Promoteur immobilier",
    location: "Kinshasa, RDC",
    content:
      "La gestion multi-villes est un atout majeur. Je gère 200 unités réparties sur 3 villes depuis mon téléphone. Impressionnant.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 sm:py-28 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Témoignages
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Ils nous font confiance
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Des gestionnaires immobiliers à travers l'Afrique utilisent notre plateforme au quotidien.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto" staggerDelay={0.15}>
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name}>
              <div className="flex flex-col p-6 rounded-2xl border border-border bg-card h-full">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-primary text-primary"
                    />
                  ))}
                </div>

                <blockquote className="text-sm text-foreground leading-relaxed flex-1">
                  "{t.content}"
                </blockquote>

                <div className="mt-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {t.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                      <p className="text-xs text-muted-foreground">{t.location}</p>
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
