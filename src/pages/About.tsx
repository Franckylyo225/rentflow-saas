import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Building2, Globe, Users, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const VALUES = [
  {
    icon: Target,
    title: "Simplicité",
    description: "Des outils intuitifs conçus pour vous faire gagner du temps au quotidien.",
  },
  {
    icon: Building2,
    title: "Expertise locale",
    description: "Une solution pensée pour les réalités du marché immobilier en Afrique de l'Ouest.",
  },
  {
    icon: Users,
    title: "Proximité",
    description: "Un accompagnement humain et réactif pour chacun de nos clients.",
  },
  {
    icon: Globe,
    title: "Innovation",
    description: "Une plateforme en constante évolution pour répondre à vos besoins.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      <main className="max-w-4xl mx-auto px-5 sm:px-8 pt-28 pb-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            À propos de RentFlow
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            RentFlow est une solution de gestion locative moderne, conçue par{" "}
            <strong className="text-foreground">New Wave Conception</strong> pour simplifier
            le quotidien des gestionnaires immobiliers en Afrique.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-foreground mb-4">Notre mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            Nous croyons que la gestion locative ne devrait pas être un casse-tête.
            Notre mission est de fournir aux professionnels de l'immobilier des outils
            numériques performants, accessibles et adaptés aux spécificités du marché
            africain — de la collecte des loyers au suivi des impayés, en passant par
            la gestion du patrimoine foncier.
          </p>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-foreground mb-6">Nos valeurs</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {VALUES.map((v) => (
              <Card key={v.title}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <v.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{v.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Éditeur */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold text-foreground mb-4">L'éditeur</h2>
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="font-semibold text-foreground mb-1">New Wave Conception</p>
            <p className="text-sm text-muted-foreground mb-3">
              Entreprise intégratrice de solutions web
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Basée à Abidjan en Côte d'Ivoire, New Wave Conception accompagne les entreprises
              dans leur transformation numérique en concevant des solutions web sur mesure,
              robustes et évolutives. RentFlow est notre réponse aux défis de la gestion
              locative sur le continent africain.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-primary/5 border border-primary/10 rounded-xl p-8">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Une question ? Un projet ?
          </h2>
          <p className="text-muted-foreground mb-5">
            N'hésitez pas à nous contacter pour en savoir plus sur RentFlow.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Nous contacter
          </a>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
