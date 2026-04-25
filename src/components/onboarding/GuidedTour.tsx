import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, DoorOpen, Users, Receipt, FileText, BarChart3,
  Check, ArrowRight, ArrowLeft, X, Sparkles, Rocket, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProperties, useUnits, useTenants, useRentPayments } from "@/hooks/useData";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Building2;
  tips: string[];
  cta: string;
  route: string;
  routeAction?: string;
  isComplete: (ctx: TourContext) => boolean;
}

interface TourContext {
  propertiesCount: number;
  unitsCount: number;
  tenantsCount: number;
  paymentsCount: number;
}

const STEPS: TourStep[] = [
  {
    id: "property",
    title: "Ajoutez votre premier bien",
    description: "Un bien représente un immeuble, une villa, un duplex ou tout immobilier que vous gérez.",
    icon: Building2,
    tips: [
      "Donnez-lui un nom reconnaissable (ex: « Résidence des Palmiers »)",
      "Sélectionnez la ville et l'adresse complète",
      "Choisissez le type de bien (immeuble, villa…)",
    ],
    cta: "Ajouter un bien",
    route: "/properties",
    routeAction: "new",
    isComplete: (c) => c.propertiesCount > 0,
  },
  {
    id: "units",
    title: "Créez les unités locatives",
    description: "Chaque unité (appartement, studio, local) appartient à un bien et possède son propre loyer.",
    icon: DoorOpen,
    tips: [
      "Ouvrez la fiche du bien que vous venez d'ajouter",
      "Cliquez sur « Ajouter une unité » et renseignez le loyer mensuel",
      "Indiquez le nombre de pièces et l'étage si pertinent",
    ],
    cta: "Gérer les unités",
    route: "/properties",
    isComplete: (c) => c.unitsCount > 0,
  },
  {
    id: "tenant",
    title: "Enregistrez votre premier locataire",
    description: "Associez un locataire à une unité libre avec les détails de son bail (durée, caution, avance).",
    icon: Users,
    tips: [
      "Sélectionnez l'unité disponible à louer",
      "Particulier ou entreprise : adaptez les informations collectées",
      "Pour un nouveau bail, indiquez les mois d'avance déjà payés",
    ],
    cta: "Ajouter un locataire",
    route: "/tenants",
    routeAction: "new",
    isComplete: (c) => c.tenantsCount > 0,
  },
  {
    id: "rent",
    title: "Suivez les loyers",
    description: "La plateforme génère automatiquement les échéances mensuelles. Enregistrez les paiements reçus en quelques clics.",
    icon: Receipt,
    tips: [
      "Consultez les loyers du mois dans la page « Loyers »",
      "Marquez un paiement comme reçu et générez la quittance PDF",
      "Filtrez par période pour voir les statistiques d'un mois précis",
    ],
    cta: "Voir les loyers",
    route: "/rents",
    isComplete: (c) => c.paymentsCount > 0,
  },
  {
    id: "contract",
    title: "Générez les contrats de bail",
    description: "Créez ou téléversez les contrats depuis la fiche du locataire. Personnalisez vos modèles dans les paramètres.",
    icon: FileText,
    tips: [
      "Ouvrez la fiche d'un locataire",
      "Section « Documents du bail » : générez ou téléversez un contrat",
      "Personnalisez vos modèles dans Paramètres → Contrats",
    ],
    cta: "Voir mes locataires",
    route: "/tenants",
    isComplete: (c) => c.tenantsCount > 0,
  },
  {
    id: "dashboard",
    title: "Pilotez votre activité",
    description: "Le tableau de bord centralise vos indicateurs clés : revenus, taux d'occupation, impayés.",
    icon: BarChart3,
    tips: [
      "Naviguez entre les mois avec les flèches en haut",
      "Comparez vos performances mois après mois",
      "Accédez aux rapports détaillés depuis le menu « Rapports »",
    ],
    cta: "Aller au tableau de bord",
    route: "/dashboard",
    isComplete: (c) =>
      c.propertiesCount > 0 && c.unitsCount > 0 && c.tenantsCount > 0,
  },
];

const STORAGE_KEY = "rentflow_tour_dismissed";
const COLLAPSED_KEY = "rentflow_tour_collapsed";

interface GuidedTourProps {
  /** Force l'ouverture (ignore le flag de dismiss) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GuidedTour({ open: controlledOpen, onOpenChange }: GuidedTourProps) {
  const navigate = useNavigate();
  const { data: properties, loading: loadingProperties } = useProperties();
  const { data: units, loading: loadingUnits } = useUnits();
  const { data: tenants, loading: loadingTenants } = useTenants();
  const { data: payments, loading: loadingPayments } = useRentPayments();

  // Tant que les données ne sont pas chargées, on ne peut pas évaluer l'état du tour.
  const dataReady = !loadingProperties && !loadingUnits && !loadingTenants && !loadingPayments;

  const ctx: TourContext = useMemo(
    () => ({
      propertiesCount: properties.length,
      unitsCount: units.length,
      tenantsCount: tenants.length,
      paymentsCount: payments.length,
    }),
    [properties, units, tenants, payments]
  );

  const completedCount = STEPS.filter((s) => s.isComplete(ctx)).length;
  const allDone = dataReady && completedCount === STEPS.length;

  const firstIncompleteIdx = useMemo(() => {
    const idx = STEPS.findIndex((s) => !s.isComplete(ctx));
    return idx === -1 ? 0 : idx;
  }, [ctx]);

  const [internalOpen, setInternalOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(firstIncompleteIdx);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  });

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  useEffect(() => {
    if (isControlled) return;
    if (!dataReady) return; // attendre les données pour éviter un flash
    if (allDone) return;
    const dismissed = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
    if (!dismissed) setInternalOpen(true);
  }, [allDone, isControlled, dataReady]);

  useEffect(() => {
    setStepIdx(firstIncompleteIdx);
  }, [firstIncompleteIdx]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  // En mode non contrôlé, ne rien afficher tant que les données ne sont pas chargées
  // (sinon la fenêtre s'ouvre puis se ferme dès que les données arrivent → "flash")
  if (!isControlled && !dataReady) return null;
  if (allDone && !isControlled) return null;
  if (!open) return null;

  const current = STEPS[stepIdx];
  const Icon = current.icon;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);

  const handleAction = () => {
    const path = current.routeAction ? `${current.route}?action=${current.routeAction}` : current.route;
    navigate(path);
  };

  const handleClose = () => {
    if (!isControlled) localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "fixed z-40 bg-card border border-border rounded-xl shadow-2xl overflow-hidden",
          "bottom-4 right-4",
          "w-[calc(100vw-2rem)] sm:w-96 max-w-sm",
        )}
        role="dialog"
        aria-label="Aide à la prise en main"
      >
        {/* Header (toujours visible) */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <button
            onClick={toggleCollapsed}
            className="flex-1 min-w-0 text-left"
            aria-label={collapsed ? "Développer" : "Réduire"}
          >
            <p className="text-sm font-semibold text-foreground truncate">Prise en main</p>
            <p className="text-[11px] text-muted-foreground">
              {completedCount}/{STEPS.length} étapes · {progressPct}%
            </p>
          </button>
          <button
            onClick={toggleCollapsed}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            aria-label={collapsed ? "Développer" : "Réduire"}
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={handleClose}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Fermer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress bar fine sous le header */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Contenu (collapsable) */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {/* Step dots */}
              <div className="flex items-center gap-1 px-4 pt-3">
                {STEPS.map((s, i) => {
                  const done = s.isComplete(ctx);
                  const active = i === stepIdx;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStepIdx(i)}
                      className={cn(
                        "h-1 rounded-full transition-all flex-1",
                        active ? "bg-primary" : done ? "bg-primary/40" : "bg-muted"
                      )}
                      aria-label={`Étape ${i + 1}`}
                    />
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="px-4 py-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        current.isComplete(ctx)
                          ? "bg-success/15 text-success"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {current.isComplete(ctx) ? (
                        <Check className="h-4.5 w-4.5" />
                      ) : (
                        <Icon className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Étape {stepIdx + 1}/{STEPS.length}
                      </p>
                      <h3 className="text-sm font-bold text-foreground leading-tight">
                        {current.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {current.description}
                  </p>

                  <ul className="space-y-1.5 rounded-lg bg-muted/40 border border-border p-2.5">
                    {current.tips.slice(0, 3).map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <div className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <span className="leading-snug">{tip}</span>
                      </li>
                    ))}
                  </ul>

                  {current.isComplete(ctx) && (
                    <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-1.5 rounded-md">
                      <Check className="h-3 w-3" />
                      <span>Étape terminée</span>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                  disabled={stepIdx === 0}
                  className="h-7 px-2 text-xs"
                >
                  <ArrowLeft className="h-3 w-3" />
                </Button>

                <div className="flex items-center gap-1.5">
                  {stepIdx < STEPS.length - 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}
                      className="h-7 px-2 text-xs"
                    >
                      Suivant
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={allDone ? handleClose : handleAction}
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    {allDone ? (
                      <>Terminer <Rocket className="h-3 w-3" /></>
                    ) : (
                      <>{current.cta} <ArrowRight className="h-3 w-3" /></>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

/** Bouton pour rouvrir le tour à la demande (ex: depuis le sidebar/Help). */
export function GuidedTourTrigger({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(COLLAPSED_KEY);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        {children ?? (
          <>
            <Sparkles className="h-4 w-4" /> Reprendre le tour guidé
          </>
        )}
      </button>
      <GuidedTour open={open} onOpenChange={setOpen} />
    </>
  );
}
