import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowRight, Loader2, Crown, Clock, AlertTriangle, History, Download } from "lucide-react";
import { downloadInvoice, generateInvoiceNumber, type InvoiceData } from "@/lib/generateInvoice";
import { PromoCodeInput } from "@/components/promo/PromoCodeInput";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

interface Subscription {
  plan: string;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface HistoryEntry {
  id: string;
  event_type: string;
  previous_plan: string | null;
  new_plan: string | null;
  amount: number;
  notes: string | null;
  created_at: string;
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

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  trial: { label: "Essai gratuit", variant: "secondary" },
  active: { label: "Actif", variant: "default" },
  expired: { label: "Expiré", variant: "destructive" },
  cancelled: { label: "Annulé", variant: "outline" },
};

function formatPrice(price: number) {
  return price.toLocaleString("fr-FR");
}

export function SubscriptionTab() {
  const { profile, organization } = useProfile();
  const organizationId = profile?.organization_id;
  const {
    planName, currentProperties, currentUsers,
    maxProperties, maxUsers, propertyRatio, userRatio,
    daysUntilExpiry, expired, subscriptionStatus,
  } = usePlanLimits();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);
    const [plansRes, subRes, historyRes] = await Promise.all([
      supabase.from("plans").select("slug, name, description, price_monthly, max_properties, max_users, feature_flags, sort_order").eq("is_visible", true).order("sort_order"),
      supabase.from("subscriptions").select("plan, status, trial_ends_at, current_period_start, current_period_end").eq("organization_id", organizationId).maybeSingle(),
      supabase.from("subscription_history").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(20),
    ]);
    setPlans((plansRes.data as Plan[]) || []);
    setSubscription(subRes.data as Subscription | null);
    setHistory((historyRes.data as HistoryEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const currentSlug = subscription?.plan || "starter";
  const currentPlan = plans.find(p => p.slug === currentSlug);
  const isTrial = subscriptionStatus === "trial";

  const [upgrading, setUpgrading] = useState(false);

  const handleSelectPlan = (slug: string) => {
    if (slug === currentSlug && !expired) return;
    setSelectedPlan(slug);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan || !organizationId) return;
    const plan = plans.find(p => p.slug === selectedPlan);
    if (!plan) return;

    // Custom/enterprise plan → contact request only
    if (plan.price_monthly === 0 && plan.max_properties === null) {
      toast.info("Demande envoyée", {
        description: `Notre équipe vous contactera pour un devis personnalisé du plan ${plan.name}.`,
      });
      setSelectedPlan(null);
      return;
    }

    setUpgrading(true);
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan: selectedPlan,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("organization_id", organizationId);

    if (error) {
      toast.error("Erreur lors du changement de plan", { description: error.message });
    } else {
      setSubscription(prev => prev ? {
        ...prev,
        plan: selectedPlan,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } : prev);
      toast.success("Plan mis à jour", {
        description: `Vous êtes maintenant sur le plan ${plan.name}.`,
      });
      // Refresh history
      fetchData();
    }
    setSelectedPlan(null);
    setUpgrading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current plan summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Plan actuel : {planName}
              </CardTitle>
              <CardDescription className="mt-1">
                {isTrial ? "Vous êtes en période d'essai gratuit" : "Votre abonnement en cours"}
              </CardDescription>
            </div>
            {subscription && (
              <Badge variant={STATUS_LABELS[subscription.status]?.variant || "secondary"}>
                {STATUS_LABELS[subscription.status]?.label || subscription.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Expiry info */}
          {daysUntilExpiry !== null && (
            <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
              expired ? "border-destructive/40 bg-destructive/5" : daysUntilExpiry <= 7 ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-muted/30"
            }`}>
              {expired ? (
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <p className="text-sm">
                {expired
                  ? isTrial ? "Votre essai gratuit est terminé." : "Votre abonnement a expiré."
                  : isTrial
                    ? `Essai gratuit — ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? "s" : ""} restant${daysUntilExpiry > 1 ? "s" : ""}`
                    : `Renouvellement dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? "s" : ""}`}
              </p>
              {subscription?.current_period_end && !expired && (
                <span className="ml-auto text-xs text-muted-foreground">
                  jusqu'au {format(new Date(isTrial ? subscription.trial_ends_at! : subscription.current_period_end), "d MMMM yyyy", { locale: fr })}
                </span>
              )}
            </div>
          )}

          {/* Usage gauges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Biens immobiliers</span>
                <span className="font-medium text-foreground">
                  {currentProperties}{maxProperties !== null ? ` / ${maxProperties}` : " / ∞"}
                </span>
              </div>
              <Progress value={maxProperties ? Math.min(propertyRatio * 100, 100) : 0} className="h-2" />
            </div>
            <div className="space-y-2 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Utilisateurs</span>
                <span className="font-medium text-foreground">
                  {currentUsers}{maxUsers !== null ? ` / ${maxUsers}` : " / ∞"}
                </span>
              </div>
              <Progress value={maxUsers ? Math.min(userRatio * 100, 100) : 0} className="h-2" />
            </div>
          </div>

          {/* Current features */}
          {currentPlan && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Fonctionnalités incluses</p>
              <div className="flex flex-wrap gap-2">
                {currentPlan.feature_flags.map(flag => (
                  <Badge key={flag} variant="secondary" className="text-xs">
                    {FEATURE_LABELS[flag] || flag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan selection */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {expired ? "Choisissez un plan pour continuer" : "Changer de plan"}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Sélectionnez le plan adapté à votre activité.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const isCurrent = plan.slug === currentSlug && !expired;
            const isSelected = plan.slug === selectedPlan;
            const isCustom = plan.price_monthly === 0 && plan.max_properties === null;
            const isMiddle = plans.length >= 2 && plan.slug === plans[Math.floor(plans.length / 2)]?.slug;

            return (
              <Card
                key={plan.slug}
                className={`relative cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "ring-2 ring-primary border-primary shadow-md"
                    : isCurrent
                      ? "border-primary/40 bg-primary/5"
                      : "hover:shadow-md"
                }`}
                onClick={() => !isCurrent && handleSelectPlan(plan.slug)}
              >
                {isMiddle && !isCurrent && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-0.5 rounded-full text-xs">
                    Recommandé
                  </Badge>
                )}
                {isCurrent && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground px-4 py-0.5 rounded-full text-xs border">
                    Plan actuel
                  </Badge>
                )}

                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {plan.description && (
                    <CardDescription className="text-xs">{plan.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {isCustom ? (
                      <span className="text-2xl font-extrabold text-foreground">Sur mesure</span>
                    ) : (
                      <>
                        <span className="text-2xl font-extrabold text-foreground">{formatPrice(plan.price_monthly)}</span>
                        <span className="text-muted-foreground text-xs ml-1">FCFA/mois</span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      <span>{plan.max_properties !== null ? `${plan.max_properties} unités` : "Unités illimitées"}</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      <span>{plan.max_users !== null ? `${plan.max_users} utilisateur${plan.max_users > 1 ? "s" : ""}` : "Utilisateurs illimités"}</span>
                    </li>
                    {plan.feature_flags.slice(0, 4).map(flag => (
                      <li key={flag} className="flex items-center gap-2 text-xs">
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        <span>{FEATURE_LABELS[flag] || flag}</span>
                      </li>
                    ))}
                    {plan.feature_flags.length > 4 && (
                      <li className="text-xs text-muted-foreground pl-5">
                        + {plan.feature_flags.length - 4} autres fonctionnalités
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Confirmation panel */}
      {selectedPlan && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="font-semibold text-foreground">
                  {expired ? "Souscrire au plan" : "Passer au plan"} {plans.find(p => p.slug === selectedPlan)?.name}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {(() => {
                    const sp = plans.find(p => p.slug === selectedPlan);
                    if (!sp) return "";
                    if (sp.price_monthly === 0 && sp.max_properties === null) return "Notre équipe vous contactera pour un devis personnalisé.";
                    return `${formatPrice(sp.price_monthly)} FCFA/mois — ${sp.max_properties !== null ? sp.max_properties + " unités" : "illimité"}, ${sp.max_users !== null ? sp.max_users + " utilisateurs" : "illimité"}`;
                  })()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedPlan(null)} disabled={upgrading}>
                  Annuler
                </Button>
                <Button size="sm" className="gap-1.5" onClick={handleConfirmUpgrade} disabled={upgrading}>
                  {upgrading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  {upgrading ? "En cours..." : "Confirmer"}
                </Button>
              </div>
            </div>

            {/* Promo code input */}
            {organizationId && (() => {
              const sp = plans.find(p => p.slug === selectedPlan);
              if (!sp || (sp.price_monthly === 0 && sp.max_properties === null)) return null;
              return (
                <PromoCodeInput
                  organizationId={organizationId}
                  planSlug={selectedPlan}
                  planPrice={sp.price_monthly}
                  onApplied={() => {}}
                  onRemoved={() => {}}
                />
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Historique</CardTitle>
              <CardDescription>Changements de plan et événements récents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucun événement enregistré</p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => {
                const eventConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
                  plan_change: { label: "Changement de plan", variant: "default" },
                  status_change: { label: "Changement de statut", variant: "secondary" },
                  trial_start: { label: "Début d'essai", variant: "outline" },
                  payment: { label: "Paiement", variant: "default" },
                };
                const config = eventConfig[entry.event_type] || { label: entry.event_type, variant: "secondary" as const };

                return (
                  <div key={entry.id} className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={config.variant} className="text-xs shrink-0">
                        {config.label}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {entry.event_type === "plan_change" && entry.previous_plan && entry.new_plan
                            ? `${entry.previous_plan} → ${entry.new_plan}`
                            : entry.event_type === "trial_start"
                              ? `Plan ${entry.new_plan || "starter"}`
                              : entry.event_type === "status_change"
                                ? `${entry.previous_plan || "?"} → ${entry.new_plan || "?"}`
                                : entry.notes || "—"}
                        </p>
                        {entry.amount > 0 && (
                          <p className="text-xs text-muted-foreground">{formatPrice(entry.amount)} FCFA</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(entry.created_at), "d MMM yyyy, HH:mm", { locale: fr })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
