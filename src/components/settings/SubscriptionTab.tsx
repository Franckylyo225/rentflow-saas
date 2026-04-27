import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, ArrowRight, Loader2, Crown, Clock, AlertTriangle, History, Download, CreditCard, Tag, Sparkles, Gift } from "lucide-react";
import { downloadInvoice, generateInvoiceNumber, type InvoiceData } from "@/lib/generateInvoice";
import { PromoCodeInput } from "@/components/promo/PromoCodeInput";
import { PaymentHistoryCard } from "@/components/settings/PaymentHistoryCard";
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
  yearly_discount_percent: number;
  max_properties: number | null;
  max_users: number | null;
  feature_flags: string[];
  display_features: string[];
  status: string;
  cta_label: string;
  sort_order: number;
}

type BillingCycle = "monthly" | "yearly";

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

function computeYearlyPrice(monthly: number, discountPct: number) {
  const total = monthly * 12;
  return Math.round(total * (1 - Math.max(0, Math.min(100, discountPct)) / 100));
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
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [promoApplied, setPromoApplied] = useState<{ discount: number; final_price: number } | null>(null);

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);
    const [plansRes, subRes, historyRes] = await Promise.all([
      supabase.from("plans").select("slug, name, description, price_monthly, yearly_discount_percent, max_properties, max_users, feature_flags, display_features, status, cta_label, sort_order").in("status", ["active"]).order("sort_order"),
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
    setBillingCycle("monthly");
    setPromoApplied(null);
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

    // Free plan → no payment needed, switch directly
    if (plan.price_monthly === 0) {
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
        toast.success("Plan mis à jour");
        fetchData();
      }
      setSelectedPlan(null);
      setUpgrading(false);
      return;
    }

    // Paid plan → redirect to GeniusPay checkout
    setUpgrading(true);
    try {
      const amount = promoApplied ? promoApplied.final_price : plan.price_monthly;
      const { data, error } = await supabase.functions.invoke("geniuspay-create-payment", {
        body: {
          plan_slug: selectedPlan,
          amount,
        },
      });

      if (error || !data?.checkout_url) {
        throw new Error(error?.message || data?.error || "Impossible d'initier le paiement");
      }

      toast.info("Redirection vers le paiement sécurisé…", {
        description: `Environnement : ${data.environment === "live" ? "Production" : "Sandbox (test)"}`,
      });

      // Brief delay so user sees the toast, then redirect
      setTimeout(() => {
        window.location.href = data.checkout_url;
      }, 600);
    } catch (e) {
      toast.error("Échec du paiement", {
        description: e instanceof Error ? e.message : "Erreur inconnue",
      });
      setUpgrading(false);
    }
  };

  // Handle return from GeniusPay checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (payment === "success") {
      toast.success("Paiement reçu", {
        description: "Votre abonnement sera activé dès confirmation par GeniusPay.",
      });
      // Refresh after short delay to give webhook time to land
      setTimeout(() => fetchData(), 1500);
      params.delete("payment");
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState({}, "", newUrl);
    } else if (payment === "error") {
      toast.error("Paiement échoué ou annulé");
      params.delete("payment");
      const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState({}, "", newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.slug === currentSlug && !expired;
            const isSelected = plan.slug === selectedPlan;
            const isCustom = plan.price_monthly === 0 && plan.max_properties === null;
            const isPopular = plans.length >= 2 && plan.slug === plans[Math.floor(plans.length / 2)]?.slug;

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
              <div
                key={plan.slug}
                onClick={() => !isCurrent && handleSelectPlan(plan.slug)}
                className={`relative flex flex-col rounded-2xl border-2 p-6 transition-all ${
                  isCurrent
                    ? "border-primary/40 bg-primary/5 cursor-default"
                    : isSelected
                      ? "border-primary bg-primary/5 shadow-md cursor-pointer"
                      : isPopular
                        ? "border-primary/30 bg-card hover:shadow-md cursor-pointer"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-sm cursor-pointer"
                }`}
              >
                {isPopular && !isCurrent && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-0.5 text-xs rounded-full">
                    Recommandé
                  </Badge>
                )}
                {isCurrent && (
                  <Badge variant="outline" className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-background px-4 py-0.5 text-xs rounded-full">
                    Plan actuel
                  </Badge>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  )}
                </div>

                <div className="mb-5">
                  {isCustom ? (
                    <span className="text-2xl font-extrabold text-foreground">Sur mesure</span>
                  ) : (
                    <>
                      <span className="text-2xl font-extrabold text-foreground">
                        {formatPrice(plan.price_monthly)}
                      </span>
                      <span className="text-muted-foreground ml-1 text-xs">FCFA/mois</span>
                    </>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <div className="mt-0.5 p-0.5 rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4">
                  {isCurrent ? (
                    <Button variant="outline" size="sm" className="w-full rounded-full" disabled>
                      Plan actuel
                    </Button>
                  ) : isCustom ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-full"
                      onClick={(e) => { e.stopPropagation(); window.open("/contact", "_blank"); }}
                    >
                      Contactez-nous
                    </Button>
                  ) : (
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="w-full rounded-full"
                      onClick={(e) => { e.stopPropagation(); handleSelectPlan(plan.slug); }}
                    >
                      {isSelected ? "✓ Sélectionné" : "Choisir cette offre"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation panel — harmonised with Onboarding billing recap */}
      {selectedPlan && (() => {
        const sp = plans.find(p => p.slug === selectedPlan);
        if (!sp) return null;
        const isCustom = sp.price_monthly === 0 && sp.max_properties === null;
        const isPaid = sp.price_monthly > 0;
        const finalAmount = promoApplied ? promoApplied.final_price : sp.price_monthly;

        return (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 space-y-5">
              {/* Recap */}
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {expired ? "Souscrire au plan" : "Passer au plan"}
                    </p>
                    <p className="text-lg font-bold text-foreground truncate">{sp.name}</p>
                  </div>
                  {isPaid ? (
                    <Badge variant="default" className="gap-1 shrink-0">
                      <CreditCard className="h-3 w-3" /> Paiement requis
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 shrink-0">
                      <Sparkles className="h-3 w-3" /> {isCustom ? "Sur mesure" : "Sans paiement"}
                    </Badge>
                  )}
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-3 text-sm">
                    <span className="text-muted-foreground shrink-0">Prix mensuel</span>
                    <span className="font-semibold text-foreground text-right break-all">
                      {isCustom ? "Sur mesure" : isPaid ? `${formatPrice(sp.price_monthly)} FCFA` : "Gratuit"}
                    </span>
                  </div>

                  {promoApplied && isPaid && (
                    <div className="flex justify-between items-center gap-3 text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                        <Tag className="h-3.5 w-3.5" /> Remise promo
                      </span>
                      <span className="font-semibold text-primary text-right break-all">
                        −{formatPrice(promoApplied.discount)} FCFA
                      </span>
                    </div>
                  )}

                  <div className="h-px bg-border" />

                  <div className="flex justify-between items-baseline gap-3 pt-1">
                    <span className="font-semibold text-foreground text-sm shrink-0">
                      {isPaid ? "Total à payer" : "Total"}
                    </span>
                    <span className="font-extrabold text-lg sm:text-xl text-foreground text-right break-all">
                      {isCustom ? "Sur mesure" : isPaid ? `${formatPrice(finalAmount)} FCFA` : "Gratuit"}
                      {isPaid && (
                        <span className="text-muted-foreground font-normal text-xs ml-1">/mois</span>
                      )}
                    </span>
                  </div>
                </div>

                {isPaid && promoApplied && (
                  <div className="flex items-start gap-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="break-words">
                      Économie de {formatPrice(promoApplied.discount)} FCFA appliquée
                    </span>
                  </div>
                )}
              </div>

              {/* Promo code input */}
              {organizationId && isPaid && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Gift className="h-4 w-4 text-primary" /> Code promo
                  </div>
                  <PromoCodeInput
                    organizationId={organizationId}
                    planSlug={selectedPlan}
                    planPrice={sp.price_monthly}
                    onApplied={(r) => setPromoApplied({ discount: r.discount!, final_price: r.final_price! })}
                    onRemoved={() => setPromoApplied(null)}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto rounded-full"
                  onClick={() => { setSelectedPlan(null); setPromoApplied(null); }}
                  disabled={upgrading}
                >
                  Annuler
                </Button>
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-full gap-2 font-semibold h-12 px-6 whitespace-normal"
                  onClick={handleConfirmUpgrade}
                  disabled={upgrading}
                >
                  {upgrading ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : isPaid ? (
                    <CreditCard className="h-4 w-4 shrink-0" />
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">
                    {upgrading
                      ? "En cours…"
                      : isPaid
                        ? `Payer ${formatPrice(finalAmount)} FCFA`
                        : isCustom
                          ? "Demander un devis"
                          : "Activer ce plan"}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Payment transactions history */}
      <PaymentHistoryCard />

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
                    <div className="flex items-center gap-2 shrink-0">
                      {(entry.event_type === "plan_change" || entry.event_type === "payment") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Télécharger la facture"
                          onClick={() => {
                            const plan = plans.find(p => p.slug === entry.new_plan);
                            const invoiceData: InvoiceData = {
                              invoiceNumber: generateInvoiceNumber("sub", entry.id),
                              invoiceDate: entry.created_at,
                              organizationName: organization?.name || "Mon entreprise",
                              organizationAddress: organization?.address || undefined,
                              organizationPhone: organization?.phone || undefined,
                              organizationEmail: organization?.email || undefined,
                              organizationLogoUrl: organization?.logo_url || undefined,
                              clientName: organization?.name || "Mon entreprise",
                              clientEmail: organization?.email || undefined,
                              items: [{
                                description: `Abonnement ${plan?.name || entry.new_plan || "—"}${entry.previous_plan ? ` (depuis ${entry.previous_plan})` : ""}`,
                                quantity: 1,
                                unitPrice: plan?.price_monthly || entry.amount || 0,
                                total: plan?.price_monthly || entry.amount || 0,
                              }],
                              subtotal: plan?.price_monthly || entry.amount || 0,
                              total: plan?.price_monthly || entry.amount || 0,
                              currency: "FCFA",
                              status: "paid",
                              notes: entry.notes || undefined,
                            };
                            downloadInvoice(invoiceData);
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "d MMM yyyy, HH:mm", { locale: fr })}
                      </span>
                    </div>
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
