import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, DoorOpen, Users, Receipt, FileText, BarChart3,
  Check, ArrowRight, ArrowLeft, X, Sparkles, Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useProperties, useUnits, useTenants, useRentPayments } from "@/hooks/useData";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Building2;
  tips: string[];
  cta: string;
  route: string;
  routeAction?: string; // ?action=new pour pré-ouvrir
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
    isComplete: (c) => c.tenantsCount > 0, // proxy : disponible dès qu'il y a un locataire
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

interface GuidedTourProps {
  /** Force l'ouverture (ignore le flag de dismiss) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GuidedTour({ open: controlledOpen, onOpenChange }: GuidedTourProps) {
  const navigate = useNavigate();
  const { data: properties } = useProperties();
  const { data: units } = useUnits();
  const { data: tenants } = useTenants();
  const { data: payments } = useRentPayments();

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
  const allDone = completedCount === STEPS.length;

  // Auto-positionner sur la première étape non terminée
  const firstIncompleteIdx = useMemo(() => {
    const idx = STEPS.findIndex((s) => !s.isComplete(ctx));
    return idx === -1 ? 0 : idx;
  }, [ctx]);

  const [internalOpen, setInternalOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(firstIncompleteIdx);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  // Auto-ouverture : tant que la checklist n'est pas complète et que l'utilisateur ne l'a pas fermée manuellement
  useEffect(() => {
    if (isControlled) return;
    if (allDone) return;
    const dismissed = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1";
    if (!dismissed) setInternalOpen(true);
  }, [allDone, isControlled]);

  // Si l'utilisateur progresse, on avance automatiquement à l'étape suivante non terminée
  useEffect(() => {
    setStepIdx(firstIncompleteIdx);
  }, [firstIncompleteIdx]);

  if (allDone && !isControlled) return null;

  const current = STEPS[stepIdx];
  const Icon = current.icon;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);

  const handleAction = () => {
    const path = current.routeAction ? `${current.route}?action=${current.routeAction}` : current.route;
    setOpen(false);
    navigate(path);
  };

  const handleClose = () => {
    if (!isControlled) localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const handleSkipForNow = () => {
    if (!isControlled) localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        {/* Header avec progression */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4 border-b">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Prise en main de RentFlow</h2>
              <p className="text-xs text-muted-foreground">
                Étape {stepIdx + 1} sur {STEPS.length} · {completedCount}/{STEPS.length} terminée{completedCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Progress value={progressPct} className="h-1.5" />
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mt-3">
            {STEPS.map((s, i) => {
              const done = s.isComplete(ctx);
              const active = i === stepIdx;
              return (
                <button
                  key={s.id}
                  onClick={() => setStepIdx(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    active ? "w-8 bg-primary" : done ? "w-4 bg-primary/50" : "w-4 bg-muted"
                  }`}
                  aria-label={`Aller à l'étape ${i + 1}`}
                />
              );
            })}
          </div>
        </div>

        {/* Contenu de l'étape */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="px-6 py-6 space-y-5"
          >
            <div className="flex items-start gap-4">
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                  current.isComplete(ctx)
                    ? "bg-success/15 text-success"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {current.isComplete(ctx) ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground tracking-tight">{current.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{current.description}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comment faire</p>
              <ul className="space-y-2">
                {current.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {current.isComplete(ctx) && (
              <div className="flex items-center gap-2 text-sm text-success bg-success/10 px-3 py-2 rounded-lg">
                <Check className="h-4 w-4" />
                <span>Étape déjà terminée — vous pouvez passer à la suivante.</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={stepIdx === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Précédent
          </Button>

          <button
            onClick={handleSkipForNow}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Plus tard
          </button>

          <div className="flex items-center gap-2">
            {stepIdx < STEPS.length - 1 ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}>
                  Étape suivante
                </Button>
                <Button size="sm" onClick={handleAction} className="gap-1.5">
                  {current.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={allDone ? handleClose : handleAction} className="gap-1.5">
                {allDone ? (
                  <>Terminer <Rocket className="h-3.5 w-3.5" /></>
                ) : (
                  <>{current.cta} <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
