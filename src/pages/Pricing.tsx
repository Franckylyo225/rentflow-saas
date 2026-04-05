import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/landing/AnimatedSection";
import { supabase } from "@/integrations/supabase/client";

interface Plan {
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_properties: number | null;
  max_users: number | null;
  feature_flags: string[];
  sort_order: number;
}

const FEATURE_LABELS: Record<string, string> = {
  sms: "Relances SMS",
  reports: "Rapports financiers",
  patrimoine: "Gestion du patrimoine",
  multi_city: "Multi-villes",
  multi_country: "Multi-pays",
  api: "API & intégrations",
  sla: "SLA garanti",
  dedicated_manager: "Account manager dédié",
  onsite_training: "Formation sur site",
  email_reminders: "Relances email",
  quittances: "Quittances PDF",
  rent_tracking: "Suivi des loyers",
};

function formatPrice(price: number) {
  return price.toLocaleString("fr-FR");
}

const Pricing = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase
        .from("plans")
        .select("slug, name, description, price_monthly, max_properties, max_users, feature_flags, sort_order")
        .eq("is_visible", true)
        .order("sort_order");
      setPlans((data as Plan[]) || []);
      setLoading(false);
    }
    fetchPlans();
  }, []);

  const popularSlug = plans.length >= 2 ? plans[Math.floor(plans.length / 2)]?.slug : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />

      <section className="pt-32 pb-24 sm:pt-40 sm:pb-32 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] landing-blob rounded-full -z-10 opacity-40" />

        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight">
              Des tarifs simples et transparents
            </h1>
            <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
              14 jours d'essai gratuit sur tous les plans. Aucune carte bancaire requise.
            </p>
          </AnimatedSection>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <StaggerContainer
              className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-5xl mx-auto"
              staggerDelay={0.12}
            >
              {plans.map((plan) => {
                const isPopular = plan.slug === popularSlug;
                const isCustom = plan.price_monthly === 0 && plan.max_properties === null;

                const features: string[] = [];

                if (plan.max_properties !== null) {
                  features.push(`Jusqu'à ${plan.max_properties} unités`);
                } else {
                  features.push("Unités illimitées");
                }

                if (plan.max_users !== null) {
                  features.push(`${plan.max_users} utilisateur${plan.max_users > 1 ? "s" : ""}`);
                } else {
                  features.push("Utilisateurs illimités");
                }

                plan.feature_flags.forEach((flag) => {
                  features.push(FEATURE_LABELS[flag] || flag);
                });

                return (
                  <StaggerItem key={plan.slug}>
                    <div
                      className={`relative flex flex-col rounded-3xl border p-8 h-full transition-shadow duration-300 ${
                        isPopular
                          ? "border-primary bg-card shadow-lg"
                          : "border-border bg-card hover:shadow-md"
                      }`}
                    >
                      {isPopular && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-5 py-1 rounded-full text-xs font-semibold">
                          Le plus populaire
                        </Badge>
                      )}

                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                        )}
                      </div>

                      <div className="mb-8">
                        {isCustom ? (
                          <span className="text-4xl font-extrabold text-foreground tracking-tight">
                            Sur mesure
                          </span>
                        ) : (
                          <>
                            <span className="text-4xl font-extrabold text-foreground tracking-tight">
                              {formatPrice(plan.price_monthly)}
                            </span>
                            <span className="text-muted-foreground ml-1 text-sm">FCFA/mois</span>
                          </>
                        )}
                      </div>

                      <ul className="space-y-3.5 mb-8 flex-1">
                        {features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3 text-sm">
                            <div className="mt-0.5 p-0.5 rounded-full bg-primary/10">
                              <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className="w-full rounded-full font-semibold gap-2"
                        variant={isPopular ? "default" : "outline"}
                        size="lg"
                        asChild
                      >
                        <Link to="/auth">
                          {isCustom ? "Nous contacter" : "Commencer l'essai"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}

          <AnimatedSection className="mt-16 text-center">
            <p className="text-muted-foreground text-sm">
              Besoin d'un plan personnalisé ?{" "}
              <Link to="/auth" className="text-primary font-medium hover:underline">
                Contactez-nous
              </Link>
            </p>
          </AnimatedSection>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default Pricing;
