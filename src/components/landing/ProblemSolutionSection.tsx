import { X, Check, Building2 } from "lucide-react";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";
import problemImg from "@/assets/problem-illustration.jpg";
import solutionImg from "@/assets/solution-illustration.jpg";

const PROBLEMS = [
  "Fichiers Excel dispersés et non fiables",
  "Relances manuelles oubliées",
  "Aucune vision globale sur vos revenus",
  "Quittances créées à la main",
  "Données locataires non centralisées",
];

const SOLUTIONS = [
  "Gestion centralisée des biens",
  "Relances automatiques par email",
  "Tableau de bord financier en temps réel",
  "Quittances générées en un clic",
  "Fiches locataires complètes & scoring",
];

export function ProblemSolutionSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary text-xs font-semibold text-foreground uppercase tracking-wider mb-4">
            Problèmes & Solution
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Votre problème{" "}
            <span className="mx-3 text-muted-foreground/40">→</span>{" "}
            <span className="gradient-text">Notre solution</span>
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Problems column */}
          <AnimatedSection direction="left" delay={0.1}>
            <div className="rounded-3xl border border-destructive/15 bg-destructive/[0.03] p-8 sm:p-10 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-destructive/10">
                  <X className="h-5 w-5 text-destructive" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Sans RentFlow</h3>
              </div>

              <div className="mb-6 rounded-2xl overflow-hidden">
                <img
                  src={problemImg}
                  alt="Gestion manuelle chaotique"
                  loading="lazy"
                  width={800}
                  height={640}
                  className="w-full h-40 object-cover object-center"
                />
              </div>

              <StaggerContainer staggerDelay={0.08} className="space-y-4">
                {PROBLEMS.map((problem) => (
                  <StaggerItem key={problem}>
                    <div className="flex items-start gap-3.5 group">
                      <div className="mt-0.5 p-1 rounded-full bg-destructive/10 shrink-0">
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </div>
                      <p className="text-muted-foreground leading-relaxed line-through decoration-destructive/30">
                        {problem}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </AnimatedSection>

          {/* Solutions column */}
          <AnimatedSection direction="right" delay={0.2}>
            <div className="rounded-3xl border border-primary/20 bg-foreground p-8 sm:p-10 h-full relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-2xl bg-primary/15">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-primary-foreground">Avec RentFlow</h3>
                </div>

                <div className="mb-6 rounded-2xl overflow-hidden">
                  <img
                    src={solutionImg}
                    alt="Gestion digitale simplifiée"
                    loading="lazy"
                    width={800}
                    height={640}
                    className="w-full h-40 object-cover object-center"
                  />
                </div>

                <StaggerContainer staggerDelay={0.08} className="space-y-4">
                  {SOLUTIONS.map((solution) => (
                    <StaggerItem key={solution}>
                      <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 p-1 rounded-full bg-primary/20 shrink-0">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="text-background/80 leading-relaxed">
                          {solution}
                        </p>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
