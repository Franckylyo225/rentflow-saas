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
import { Check, ArrowRight, ArrowLeft, Building2, Sparkles, Rocket, Loader2 } from "lucide-react";
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

const STEPS = [
  { label: "Bienvenue", icon: Sparkles },
  { label: "Votre plan", icon: Rocket },
  { label: "Organisation", icon: Building2 },
  { label: "C'est parti !", icon: Check },
];

function formatPrice(price: number) {
  return price.toLocaleString("fr-FR");
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, organization, role, loading: profileLoading } = useProfile();

  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("starter");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promoApplied, setPromoApplied] = useState<{ discount: number; final_price: number } | null>(null);

  // Org config form
  const [orgName, setOrgName] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgLegalName, setOrgLegalName] = useState("");

  // Redirect if already onboarded
  useEffect(() => {
    if (!profileLoading && organization?.onboarding_completed) {
      navigate("/dashboard", { replace: true });
    }
  }, [profileLoading, organization, navigate]);

  // Pre-fill org form
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || "");
      setOrgPhone(organization.phone || "");
      setOrgAddress(organization.address || "");
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

  const handleSelectPlan = async () => {
    if (!organization) return;
    setSaving(true);
    // Upsert subscription
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
      console.error(error);
    }
    setSaving(false);
    setStep(2);
  };

  const handleSaveOrg = async () => {
    if (!organization) return;
    if (!orgName.trim()) {
      toast.error("Le nom de l'organisation est requis");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({
        name: orgName.trim(),
        phone: orgPhone.trim() || null,
        address: orgAddress.trim() || null,
        legal_name: orgLegalName.trim() || null,
      })
      .eq("id", organization.id);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    }
    setSaving(false);
    setStep(3);
  };

  const handleFinish = async () => {
    if (!organization) return;
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ onboarding_completed: true })
      .eq("id", organization.id);
    if (error) {
      toast.error("Erreur lors de la finalisation");
      console.error(error);
    } else {
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

  const selectedPlanData = plans.find((p) => p.slug === selectedPlan);
  const popularSlug = plans.length >= 2 ? plans[Math.floor(plans.length / 2)]?.slug : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Stepper */}
      <div className="w-full border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div
                    className={`flex items-center justify-center h-9 w-9 rounded-full text-sm font-semibold transition-all ${
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "bg-primary/10 text-primary ring-2 ring-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 ${isDone ? "bg-primary" : "bg-border"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg w-full text-center space-y-8"
            >
              <div className="mx-auto h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                  Bienvenue{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} !
                </h1>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
                  Configurons votre espace de gestion locative en quelques étapes simples.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                {[
                  { title: "Gérez vos biens", desc: "Immeubles, villas, appartements" },
                  { title: "Suivez les loyers", desc: "Paiements, quittances, relances" },
                  { title: "Pilotez vos finances", desc: "Dépenses, rapports, analyses" },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl bg-muted/50 p-4 space-y-1">
                    <p className="font-semibold text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
              <Button size="lg" className="rounded-full gap-2 font-semibold" onClick={() => setStep(1)}>
                Commencer <ArrowRight className="h-4 w-4" />
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
              className="max-w-4xl w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Choisissez votre formule
                </h2>
                <p className="text-muted-foreground">
                  7 jours d'essai gratuit sur tous les plans. Changez à tout moment.
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

                        {isSelected && (
                          <div className="mt-4 text-center">
                            <Badge variant="outline" className="text-primary border-primary">
                              ✓ Sélectionné
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Promo code */}
              {organization && selectedPlanData && (
                <div className="max-w-md mx-auto">
                  <PromoCodeInput
                    organizationId={organization.id}
                    planSlug={selectedPlan}
                    planPrice={selectedPlanData.price_monthly}
                    onApplied={(r) => setPromoApplied({ discount: r.discount!, final_price: r.final_price! })}
                    onRemoved={() => setPromoApplied(null)}
                  />
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

          {/* Step 2: Organization config */}
          {step === 2 && (
            <motion.div
              key="org"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                  Votre organisation
                </h2>
                <p className="text-muted-foreground text-sm">
                  Ces informations apparaîtront sur vos documents (quittances, contrats…)
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Nom de l'entreprise *</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Ex: SCI Binieba"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgLegalName">Raison sociale</Label>
                  <Input
                    id="orgLegalName"
                    value={orgLegalName}
                    onChange={(e) => setOrgLegalName(e.target.value)}
                    placeholder="Ex: SCI Binieba SARL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgPhone">Téléphone</Label>
                  <Input
                    id="orgPhone"
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    placeholder="+225 XX XX XX XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgAddress">Adresse</Label>
                  <Input
                    id="orgAddress"
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                    placeholder="Abidjan, Cocody..."
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button
                  size="lg"
                  className="rounded-full gap-2 font-semibold"
                  onClick={handleSaveOrg}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
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
              className="max-w-lg w-full text-center space-y-8"
            >
              <div className="mx-auto h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                <Rocket className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
                  Tout est prêt !
                </h2>
                <p className="text-muted-foreground text-lg">
                  Votre espace de gestion locative est configuré.
                </p>
              </div>

              {/* Recap */}
              <div className="rounded-2xl bg-muted/50 p-6 text-left space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Formule</span>
                  <span className="font-semibold text-foreground">
                    {selectedPlanData?.name || selectedPlan}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Organisation</span>
                  <span className="font-semibold text-foreground">{orgName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Période d'essai</span>
                  <Badge variant="secondary">7 jours gratuits</Badge>
                </div>
              </div>

              <Button
                size="lg"
                className="rounded-full gap-2 font-semibold"
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
