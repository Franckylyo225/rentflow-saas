import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Loader2, Bell, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedSection, StaggerContainer, StaggerItem } from "./AnimatedSection";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Plan {
  slug: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_properties: number | null;
  max_users: number | null;
  display_features: string[];
  status: string;
  cta_label: string;
  sort_order: number;
}

function formatPrice(price: number) {
  return price.toLocaleString("fr-FR");
}

export function PricingSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSlug, setWaitlistSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase
        .from("plans")
        .select("slug, name, description, price_monthly, max_properties, max_users, display_features, status, cta_label, sort_order")
        .in("status", ["active", "coming_soon"])
        .order("sort_order");
      setPlans((data as Plan[]) || []);
      setLoading(false);
    }
    fetchPlans();
  }, []);

  const handleWaitlist = async (slug: string) => {
    if (!waitlistEmail.trim() || !waitlistEmail.includes("@")) {
      toast.error("Veuillez entrer un email valide");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("waitlist").insert({ email: waitlistEmail.trim(), plan_slug: slug });
    if (error?.code === "23505") {
      toast.info("Vous êtes déjà inscrit !");
    } else if (error) {
      toast.error("Erreur lors de l'inscription");
    } else {
      toast.success("Vous serez notifié dès le lancement !");
    }
    setWaitlistEmail("");
    setWaitlistSlug(null);
    setSubmitting(false);
  };

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-secondary/40">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
            Tarifs
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight leading-tight">
            Un prix clair, sans surprise
          </h2>
          <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
            7 jours d'essai gratuit. Aucune carte requise. Résiliable à tout moment.
          </p>
        </AnimatedSection>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <StaggerContainer
            className={`grid grid-cols-1 ${plans.length === 2 ? "lg:grid-cols-2 max-w-3xl" : "lg:grid-cols-3 max-w-5xl"} gap-5 mx-auto`}
            staggerDelay={0.08}
          >
            {plans.map((plan, idx) => {
              const isComingSoon = plan.status === "coming_soon";
              const isActive = plan.status === "active";
              const isHighlighted = isActive && (plans.length === 1 || idx === Math.floor(plans.length / 2));

              return (
                <StaggerItem key={plan.slug}>
                  <div
                    className={`relative flex flex-col rounded-3xl p-8 h-full transition-all duration-300 ${
                      isHighlighted
                        ? "bg-card border-2 border-primary shadow-lg hover:-translate-y-0.5"
                        : "bg-card border border-border/60 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    {isHighlighted && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-semibold gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        Recommandé
                      </Badge>
                    )}
                    {isComingSoon && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-1 rounded-full text-xs font-semibold gap-1.5">
                        <Clock className="h-3 w-3" />
                        Bientôt disponible
                      </Badge>
                    )}

                    <div className="mb-6">
                      <h3 className="font-display text-xl font-bold text-foreground tracking-tight">
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    <div className="mb-8 pb-6 border-b border-border/60">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display text-5xl font-bold text-foreground tracking-tight">
                          {formatPrice(plan.price_monthly)}
                        </span>
                        <span className="text-muted-foreground text-sm font-medium">FCFA</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 block">par mois, HT</span>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {(plan.display_features || []).map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 p-0.5 rounded-full bg-primary/10 shrink-0">
                            <Check className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-foreground leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isActive ? (
                      <Button
                        className="w-full rounded-full font-semibold gap-2"
                        variant={isHighlighted ? "default" : "outline"}
                        size="lg"
                        asChild
                      >
                        <Link to="/auth">
                          {plan.cta_label || "Commencer gratuitement"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <Button
                          className="w-full rounded-full font-semibold"
                          variant="outline"
                          size="lg"
                          disabled
                        >
                          {plan.cta_label || "Bientôt disponible"}
                        </Button>

                        {waitlistSlug === plan.slug ? (
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="Votre email"
                              value={waitlistEmail}
                              onChange={e => setWaitlistEmail(e.target.value)}
                              className="rounded-full text-sm"
                              onKeyDown={e => e.key === "Enter" && handleWaitlist(plan.slug)}
                            />
                            <Button
                              size="sm"
                              className="rounded-full shrink-0"
                              onClick={() => handleWaitlist(plan.slug)}
                              disabled={submitting}
                            >
                              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "OK"}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full rounded-full text-primary gap-1.5"
                            onClick={() => setWaitlistSlug(plan.slug)}
                          >
                            <Bell className="h-3.5 w-3.5" />
                            Être notifié du lancement
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}

        <AnimatedSection className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Besoin d'un plan sur mesure pour plusieurs agences ?{" "}
            <Link to="/auth" className="text-primary font-semibold hover:underline">
              Contactez-nous
            </Link>
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
