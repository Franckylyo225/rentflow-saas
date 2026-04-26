import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Check, ArrowRight, ArrowLeft, Building2, Sparkles, Rocket, Loader2,
  MapPin, Home, Users, Briefcase, Tag, Gift, CreditCard, XCircle, CheckCircle2, RefreshCw,
} from "lucide-react";
import { PromoCodeInput } from "@/components/promo/PromoCodeInput";
import { toast } from "sonner";

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

const ACTIVITY_TYPES = [
  { value: "agency", label: "Agence immobilière", icon: Building2, desc: "Gestion pour le compte de tiers" },
  { value: "owner", label: "Propriétaire", icon: Home, desc: "Gestion de mes propres biens" },
  { value: "manager", label: "Gestionnaire", icon: Users, desc: "Administration de patrimoine" },
];

const STEPS = [
  { label: "Votre activité", icon: Briefcase },
  { label: "Votre plan", icon: Rocket },
  { label: "Facturation", icon: CreditCard },
  { label: "C'est parti !", icon: Check },
];

function formatPrice(price: number) {
  return price.toLocaleString("fr-FR");
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, organization, role, loading: profileLoading, refetch } = useProfile();

  // Read ?payment= synchronously so we never flash step 0 on return from GeniusPay
  const initialPaymentReturn = (() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search).get("payment");
    return p === "success" || p === "error" ? (p as "success" | "error") : null;
  })();

  const [step, setStep] = useState(initialPaymentReturn === "error" ? 2 : 0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("starter");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promoApplied, setPromoApplied] = useState<{ discount: number; final_price: number } | null>(null);
  const [paymentReturn, setPaymentReturn] = useState<"success" | "error" | null>(initialPaymentReturn);
  const [finalizing, setFinalizing] = useState(false);

  // Company form
  const [orgName, setOrgName] = useState("");
  const [orgCity, setOrgCity] = useState("");
  const [activityType, setActivityType] = useState("");

  // Redirect if already onboarded — but NOT while we're handling a payment return,
  // otherwise the user is sent to /dashboard before seeing the success/error screen.
  useEffect(() => {
    if (paymentReturn) return;
    if (!profileLoading && organization?.onboarding_completed) {
      navigate("/dashboard", { replace: true });
    }
  }, [profileLoading, organization, navigate, paymentReturn]);

  // Clean ?payment= from the URL once we've captured it in state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("payment")) return;
    params.delete("payment");
    const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
    window.history.replaceState({}, "", newUrl);
  }, []);

  const handleFinalizeAfterPayment = async () => {
    if (!organization) return;
    setFinalizing(true);
    const { error } = await supabase
      .from("organizations")
      .update({ onboarding_completed: true })
      .eq("id", organization.id);
    if (error) {
      toast.error("Erreur lors de la finalisation", { description: error.message });
      setFinalizing(false);
      return;
    }
    await refetch();
    navigate("/dashboard", { replace: true });
  };

  const handleRetryPayment = () => {
    setPaymentReturn(null);
    setStep(2);
  };

  // Pre-fill
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || "");
    }
  }, [organization]);

  // Fetch plans
  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase
        .from("plans")
        .select("slug, name, description, price_monthly, max_properties, max_users, feature_flags, sort_order")
        .eq("is_visible", true)
        .order("sort_order");
      setPlans((data as Plan[]) || []);
      setLoadingPlans(false);
    }
    fetchPlans();
  }, []);

  const handleSaveCompany = async () => {
    if (!organization) return;
    if (!orgName.trim()) {
      toast.error("Le nom de l'agence est requis");
      return;
    }
    if (!activityType) {
      toast.error("Veuillez choisir votre type d'activité");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name: orgName.trim(),
        address: orgCity.trim() || null,
      })
      .eq("id", organization.id);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    }
    setSaving(false);
    setStep(1);
  };

  const handleSelectPlan = async () => {
    if (!organization) return;
    setSaving(true);
    const { error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          organization_id: organization.id,
          plan: selectedPlan,
          status: "trial",
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "organization_id" }
      );
    if (error) {
      toast.error("Erreur lors de la sélection du plan");
    }
    setSaving(false);
    setStep(2);
  };

  const handlePromoStep = () => {
    setStep(3);
  };

  const handlePayNow = async () => {
    if (!organization || !selectedPlanData) return;
    if (selectedPlanData.price_monthly <= 0) {
      toast.error("Ce plan ne nécessite pas de paiement");
      return;
    }
    const amount = promoApplied ? promoApplied.final_price : selectedPlanData.price_monthly;
    if (amount < 200) {
      toast.error("Montant trop faible pour le paiement en ligne");
      return;
    }
    setSaving(true);
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke("geniuspay-create-payment", {
        body: {
          plan_slug: selectedPlan,
          amount,
          success_url: `${origin}/onboarding?payment=success`,
          error_url: `${origin}/onboarding?payment=error`,
        },
      });
      if (error || !data?.checkout_url) {
        throw new Error(error?.message || data?.error || "Impossible d'initier le paiement");
      }
      toast.info("Redirection vers le paiement sécurisé…", {
        description: `Environnement : ${data.environment === "live" ? "Production" : "Sandbox (test)"}`,
      });
      setTimeout(() => {
        window.location.href = data.checkout_url;
      }, 600);
    } catch (e) {
      toast.error("Échec du paiement", {
        description: e instanceof Error ? e.message : "Erreur inconnue",
      });
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!organization) return;
    setSaving(true);

    // If promo applied, extend trial to 30 days
    if (promoApplied) {
      await supabase
        .from("subscriptions")
        .update({
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("organization_id", organization.id);
    }

    const { error } = await supabase
      .from("organizations")
      .update({ onboarding_completed: true })
      .eq("id", organization.id);
    if (error) {
      toast.error("Erreur lors de la finalisation");
    } else {
      await refetch();
      navigate("/dashboard", { replace: true });
    }
    setSaving(false);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Dedicated screen when returning from GeniusPay
  if (paymentReturn === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-6 sm:space-y-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-primary/10 flex items-center justify-center"
          >
            <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-primary" strokeWidth={2.5} />
          </motion.div>

          <div className="space-y-2 sm:space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Paiement reçu 🎉
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Votre paiement a été enregistré. Votre abonnement sera activé automatiquement
              dès la confirmation par GeniusPay (sous quelques instants).
            </p>
          </div>

          <div className="rounded-xl bg-muted/50 p-4 text-xs sm:text-sm text-muted-foreground">
            Vous pouvez dès maintenant accéder à votre espace et commencer à configurer votre activité.
          </div>

          <Button
            size="lg"
            className="w-full rounded-full gap-2 font-semibold h-12 shadow-lg shadow-primary/25 px-4 whitespace-normal"
            onClick={handleFinalizeAfterPayment}
            disabled={finalizing}
          >
            {finalizing ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
            <span className="truncate">Accéder à mon espace</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </Button>
        </motion.div>
      </div>
    );
  }

  if (paymentReturn === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-6 sm:space-y-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-destructive/10 flex items-center justify-center"
          >
            <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-destructive" strokeWidth={2.5} />
          </motion.div>

          <div className="space-y-2 sm:space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Paiement non finalisé
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Le paiement a été annulé ou n'a pas abouti. Aucun montant n'a été débité.
              Vous pouvez réessayer maintenant ou revenir à l'étape précédente.
            </p>
          </div>

          <div className="rounded-xl bg-muted/50 p-4 text-xs sm:text-sm text-muted-foreground text-left space-y-2">
            <p className="font-medium text-foreground">Causes possibles :</p>
            <ul className="space-y-1 text-xs list-disc list-inside">
              <li>Paiement annulé sur la page GeniusPay</li>
              <li>Solde Mobile Money insuffisant</li>
              <li>Carte bancaire refusée</li>
              <li>Session expirée</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full rounded-full gap-2 font-semibold h-12"
              onClick={handleRetryPayment}
            >
              <RefreshCw className="h-4 w-4 shrink-0" />
              <span className="truncate">Réessayer le paiement</span>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full rounded-full gap-2 font-semibold"
              onClick={() => { setPaymentReturn(null); setStep(1); }}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">Choisir un autre plan</span>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const selectedPlanData = plans.find((p) => p.slug === selectedPlan);
  const popularSlug = plans.length >= 2 ? plans[Math.floor(plans.length / 2)]?.slug : null;
  const progressPct = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top progress bar */}
      <div className="w-full bg-card/50 backdrop-blur-sm sticky top-0 z-10 border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          {/* Progress */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Étape {step + 1} sur {STEPS.length}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          
          {/* Step indicators */}
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div
                    className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold transition-all ${
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "bg-primary/10 text-primary ring-2 ring-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 ${isDone ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {/* Step 0: Company info */}
          {step === 0 && (
            <motion.div
              key="company"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Parlez-nous de votre activité
                </h2>
                <p className="text-muted-foreground text-sm">
                  Ces informations nous aident à personnaliser votre expérience.
                </p>
              </div>

              <div className="space-y-5">
                {/* Agency name */}
                <div className="space-y-2">
                  <Label htmlFor="orgName">Nom de l'agence / entreprise *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Ex: Immobilière Ivoire"
                      className="pl-10 h-12"
                      autoFocus
                    />
                  </div>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="orgCity">Ville <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="orgCity"
                      value={orgCity}
                      onChange={(e) => setOrgCity(e.target.value)}
                      placeholder="Ex: Abidjan"
                      className="pl-10 h-12"
                    />
                  </div>
                </div>

                {/* Activity type - icon cards */}
                <div className="space-y-2">
                  <Label>Type d'activité *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {ACTIVITY_TYPES.map((type) => {
                      const Icon = type.icon;
                      const selected = activityType === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setActivityType(type.value)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                            selected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border bg-card hover:border-primary/30"
                          }`}
                        >
                          <div className={`p-2.5 rounded-xl ${selected ? "bg-primary/10" : "bg-muted"}`}>
                            <Icon className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${selected ? "text-foreground" : "text-foreground"}`}>
                              {type.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{type.desc}</p>
                          </div>
                          {selected && (
                            <div className="absolute top-2 right-2">
                              <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full rounded-full gap-2 font-semibold h-12"
                onClick={handleSaveCompany}
                disabled={saving || !orgName.trim() || !activityType}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 1: Plan selection */}
          {step === 1 && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Choisissez votre formule
                </h2>
                <p className="text-muted-foreground">
                  Essai gratuit sur tous les plans. <span className="font-medium text-primary">Aucun paiement requis.</span>
                </p>
              </div>

              {loadingPlans ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => {
                    const isSelected = selectedPlan === plan.slug;
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
                      <div
                        key={plan.slug}
                        onClick={() => setSelectedPlan(plan.slug)}
                        className={`relative flex flex-col rounded-2xl border-2 p-6 cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md"
                            : isPopular
                            ? "border-primary/30 bg-card hover:shadow-md"
                            : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                        }`}
                      >
                        {isPopular && (
                          <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-0.5 text-xs rounded-full">
                            Recommandé
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
                          {isCustom ? (
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
                              onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan.slug); }}
                            >
                              {isSelected ? "✓ Sélectionné" : "Choisir cette offre"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(0)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button
                  size="lg"
                  className="rounded-full gap-2 font-semibold"
                  onClick={handleSelectPlan}
                  disabled={saving || !selectedPlan}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Billing / Payment */}
          {step === 2 && (
            <motion.div
              key="billing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-md w-full space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Récapitulatif & facturation
                </h2>
                <p className="text-muted-foreground text-sm">
                  Vérifiez votre formule avant de procéder au paiement sécurisé.
                </p>
              </div>

              {/* Plan recap card */}
              {selectedPlanData && (
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Formule sélectionnée</p>
                      <p className="text-lg font-bold text-foreground truncate">{selectedPlanData.name}</p>
                    </div>
                    {selectedPlanData.price_monthly > 0 ? (
                      <Badge variant="default" className="gap-1 shrink-0">
                        <CreditCard className="h-3 w-3" />
                        <span className="hidden xs:inline sm:inline">Paiement requis</span>
                        <span className="xs:hidden sm:hidden">Paiement</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 shrink-0">
                        <Sparkles className="h-3 w-3" />
                        Sans paiement
                      </Badge>
                    )}
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-3 text-sm">
                      <span className="text-muted-foreground shrink-0">Prix mensuel</span>
                      <span className="font-semibold text-foreground text-right break-all">
                        {selectedPlanData.price_monthly > 0
                          ? `${formatPrice(selectedPlanData.price_monthly)} FCFA`
                          : "Sur mesure"}
                      </span>
                    </div>

                    {promoApplied && (
                      <div className="flex justify-between items-center gap-3 text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                          <Tag className="h-3.5 w-3.5" />
                          Remise promo
                        </span>
                        <span className="font-semibold text-primary text-right break-all">
                          −{formatPrice(promoApplied.discount)} FCFA
                        </span>
                      </div>
                    )}

                    <div className="h-px bg-border" />

                    <div className="flex justify-between items-baseline gap-3 pt-1">
                      <span className="font-semibold text-foreground text-sm shrink-0">
                        {selectedPlanData.price_monthly > 0 ? "Total à payer" : "Total"}
                      </span>
                      <span className="font-extrabold text-lg sm:text-xl text-foreground text-right break-all">
                        {promoApplied
                          ? `${formatPrice(promoApplied.final_price)} FCFA`
                          : selectedPlanData.price_monthly > 0
                          ? `${formatPrice(selectedPlanData.price_monthly)} FCFA`
                          : "Sur mesure"}
                        {selectedPlanData.price_monthly > 0 && (
                          <span className="text-muted-foreground font-normal text-xs ml-1">/mois</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {selectedPlanData.price_monthly > 0 && promoApplied && (
                    <div className="flex items-start gap-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="break-words">
                        Économie de {formatPrice(promoApplied.discount)} FCFA appliquée
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Promo code section */}
              {organization && selectedPlanData && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Gift className="h-4 w-4 text-primary" />
                    Code promo
                  </div>
                  <PromoCodeInput
                    organizationId={organization.id}
                    planSlug={selectedPlan}
                    planPrice={selectedPlanData.price_monthly}
                    onApplied={(r) => setPromoApplied({ discount: r.discount!, final_price: r.final_price! })}
                    onRemoved={() => setPromoApplied(null)}
                  />
                </div>
              )}

              {/* Payment options */}
              {selectedPlanData && selectedPlanData.price_monthly > 0 ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Payer maintenant</p>
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">
                        Activez votre abonnement immédiatement via paiement sécurisé GeniusPay (Mobile Money, carte).
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="w-full rounded-full gap-2 font-semibold h-12 px-4 text-sm sm:text-base whitespace-normal"
                    onClick={handlePayNow}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <CreditCard className="h-4 w-4 shrink-0" />}
                    <span className="truncate">
                      Payer {formatPrice(promoApplied ? promoApplied.final_price : selectedPlanData.price_monthly)} FCFA
                    </span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 text-center">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  <span>Aucun paiement requis pour ce plan.</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-2 w-full sm:w-auto" disabled={saving}>
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                {(!selectedPlanData || selectedPlanData.price_monthly <= 0) && (
                  <Button
                    size="lg"
                    className="rounded-full gap-2 font-semibold w-full sm:w-auto"
                    onClick={handlePromoStep}
                    disabled={saving}
                  >
                    Continuer <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-lg w-full text-center space-y-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="mx-auto h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center"
              >
                <Rocket className="h-10 w-10 text-primary" />
              </motion.div>

              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                  Votre compte est prêt ! 🎉
                </h2>
                <p className="text-muted-foreground text-lg">
                  Tout est configuré. Commencez dès maintenant.
                </p>
              </div>

              {/* Recap */}
              <div className="rounded-2xl bg-muted/50 p-6 text-left space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Entreprise</span>
                  <span className="font-semibold text-foreground">{orgName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Formule</span>
                  <span className="font-semibold text-foreground">
                    {selectedPlanData?.name || selectedPlan}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Période d'essai</span>
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    {promoApplied ? "30 jours gratuits" : "7 jours gratuits"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Paiement</span>
                  <span className="text-sm font-medium text-primary">Aucun paiement requis</span>
                </div>
              </div>

              {/* Quick wins */}
              <div className="text-left space-y-3">
                <p className="text-sm font-semibold text-foreground">Prochaines étapes :</p>
                <div className="space-y-2">
                  {[
                    "Ajouter votre premier bien immobilier",
                    "Enregistrer votre premier locataire",
                    "Créer un contrat de bail",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                        {i + 1}
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                size="lg"
                className="w-full rounded-full gap-2 font-semibold h-12 shadow-lg shadow-primary/25"
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Accéder à mon espace <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
