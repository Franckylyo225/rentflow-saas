import { Star, Quote } from "lucide-react";
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
    <section id="testimonials" className="py-24 sm:py-32 relative overflow-hidden">
      {/* Blob */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] landing-blob rounded-full -z-10 opacity-30" />

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
            Témoignages
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Ils nous font confiance
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            Des gestionnaires immobiliers à travers l'Afrique utilisent notre plateforme au quotidien.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto" staggerDelay={0.12}>
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name}>
              <div className="flex flex-col p-7 rounded-3xl bg-card border border-border h-full relative">
                <Quote className="h-8 w-8 text-primary/15 absolute top-6 right-6" />

                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-primary text-primary"
                    />
                  ))}
                </div>

                <blockquote className="text-sm text-foreground leading-relaxed flex-1">
                  « {t.content} »
                </blockquote>

                <div className="mt-6 pt-5 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {t.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
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
