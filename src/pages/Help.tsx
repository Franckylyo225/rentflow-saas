import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Building2, Users, CreditCard, FileText, Settings, BarChart3,
  ChevronRight, BookOpen, Landmark, Receipt, Bell, Shield, HelpCircle, Sparkles, ArrowRight,
} from "lucide-react";
import { GuidedTour } from "@/components/onboarding/GuidedTour";
import { Button } from "@/components/ui/button";

interface Article {
  id: string;
  title: string;
  summary: string;
  category: string;
  icon: typeof Building2;
  steps: string[];
}

const CATEGORIES = [
  { key: "all", label: "Tout", icon: BookOpen },
  { key: "properties", label: "Biens", icon: Building2 },
  { key: "tenants", label: "Locataires", icon: Users },
  { key: "rents", label: "Loyers", icon: CreditCard },
  { key: "expenses", label: "Dépenses", icon: Receipt },
  { key: "reports", label: "Rapports", icon: BarChart3 },
  { key: "contracts", label: "Contrats", icon: FileText },
  { key: "patrimoine", label: "Patrimoine", icon: Landmark },
  { key: "settings", label: "Paramètres", icon: Settings },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Sécurité", icon: Shield },
];

const ARTICLES: Article[] = [
  {
    id: "add-property",
    title: "Ajouter un bien immobilier",
    summary: "Créez un immeuble, une villa ou tout autre type de bien et ajoutez-y des unités locatives.",
    category: "properties",
    icon: Building2,
    steps: [
      "Allez dans la section « Biens » depuis le menu latéral.",
      "Cliquez sur « Ajouter un bien ».",
      "Renseignez le nom, le type (immeuble, villa, duplex…), la ville et l'adresse.",
      "Validez pour créer le bien, puis ajoutez des unités (appartements, bureaux…) depuis la fiche du bien.",
    ],
  },
  {
    id: "add-unit",
    title: "Ajouter une unité locative",
    summary: "Créez des appartements, bureaux ou locaux à l'intérieur d'un bien.",
    category: "properties",
    icon: Building2,
    steps: [
      "Ouvrez la fiche du bien concerné.",
      "Dans la section « Unités », cliquez sur « Ajouter une unité ».",
      "Renseignez le nom (ex: Apt 101), le loyer, les charges et l'étage.",
      "L'unité apparaît avec le statut « Vacant » jusqu'à l'ajout d'un locataire.",
    ],
  },
  {
    id: "add-tenant",
    title: "Enregistrer un locataire",
    summary: "Ajoutez un locataire particulier ou entreprise et associez-le à une unité.",
    category: "tenants",
    icon: Users,
    steps: [
      "Allez dans « Locataires » puis cliquez sur « Ajouter un locataire ».",
      "Choisissez le type (particulier ou entreprise).",
      "Remplissez les informations personnelles : nom, téléphone, email, pièce d'identité.",
      "Sélectionnez le bien et l'unité à attribuer.",
      "Définissez le loyer, la caution, la durée du bail et la date de début.",
      "L'unité passe automatiquement en statut « Occupé ».",
    ],
  },
  {
    id: "record-payment",
    title: "Enregistrer un paiement de loyer",
    summary: "Saisissez un règlement partiel ou total pour un mois donné.",
    category: "rents",
    icon: CreditCard,
    steps: [
      "Allez dans « Loyers » et sélectionnez le mois concerné.",
      "Repérez le locataire et cliquez sur « Enregistrer un paiement ».",
      "Indiquez le montant reçu, la méthode de paiement et la date.",
      "Le statut se met à jour automatiquement : Payé, Partiel ou En retard.",
    ],
  },
  {
    id: "generate-quittance",
    title: "Générer une quittance de loyer",
    summary: "Créez un PDF de quittance pour un loyer entièrement réglé.",
    category: "rents",
    icon: FileText,
    steps: [
      "Allez dans « Loyers » et repérez un paiement au statut « Payé ».",
      "Cliquez sur l'icône de téléchargement (PDF) dans la colonne Actions.",
      "La quittance est générée automatiquement avec les informations du locataire, du bien et du paiement.",
      "Le fichier PDF se télécharge directement sur votre appareil.",
    ],
  },
  {
    id: "add-expense",
    title: "Ajouter une dépense",
    summary: "Enregistrez une dépense fixe ou variable liée à un bien ou à l'organisation.",
    category: "expenses",
    icon: Receipt,
    steps: [
      "Allez dans « Dépenses » et cliquez sur « Ajouter une dépense ».",
      "Choisissez le type (fixe ou variable), la catégorie et la fréquence.",
      "Renseignez le montant, la date et éventuellement le bien concerné.",
      "Vous pouvez joindre un justificatif (photo ou document).",
    ],
  },
  {
    id: "create-contract",
    title: "Créer un contrat de bail",
    summary: "Générez un contrat de bail à partir d'un modèle personnalisable.",
    category: "contracts",
    icon: FileText,
    steps: [
      "Ouvrez la fiche d'un locataire.",
      "Dans l'onglet « Contrats », cliquez sur « Générer un contrat ».",
      "Sélectionnez un modèle de contrat (ou utilisez le modèle par défaut).",
      "Les informations du locataire et du bien sont pré-remplies automatiquement.",
      "Modifiez le contenu si nécessaire, puis validez.",
    ],
  },
  {
    id: "view-reports",
    title: "Consulter les rapports financiers",
    summary: "Analysez vos revenus, dépenses et taux d'occupation par période.",
    category: "reports",
    icon: BarChart3,
    steps: [
      "Allez dans « Rapports » depuis le menu latéral.",
      "Sélectionnez la période souhaitée (mois, trimestre, année).",
      "Consultez les indicateurs clés : CA, dépenses, bénéfice net, taux d'occupation.",
      "Filtrez par ville ou par bien pour une analyse plus fine.",
    ],
  },
  {
    id: "manage-patrimoine",
    title: "Gérer le patrimoine foncier",
    summary: "Ajoutez et suivez vos actifs fonciers (terrains, titres fonciers…).",
    category: "patrimoine",
    icon: Landmark,
    steps: [
      "Allez dans « Patrimoine » depuis le menu latéral.",
      "Cliquez sur « Ajouter un actif » pour enregistrer un terrain ou un bien foncier.",
      "Renseignez le titre foncier, la localité, le lotissement et le type d'actif.",
      "Ajoutez des documents (titre, plan, acte) et des contacts associés.",
      "Utilisez la carte pour géolocaliser vos actifs via un lien Google Maps.",
    ],
  },
  {
    id: "configure-notifications",
    title: "Configurer les notifications",
    summary: "Personnalisez les modèles de relance par email et SMS.",
    category: "notifications",
    icon: Bell,
    steps: [
      "Allez dans « Paramètres » puis l'onglet « Notifications SMS ».",
      "Activez ou désactivez les canaux (Email / SMS) pour chaque type de relance.",
      "Personnalisez le contenu des messages avec les variables disponibles ({nom}, {montant}…).",
      "Les relances sont envoyées automatiquement selon le calendrier configuré (J-5, J+1, J+7).",
    ],
  },
  {
    id: "manage-users",
    title: "Gérer les utilisateurs et les rôles",
    summary: "Invitez des collaborateurs et attribuez-leur un rôle (admin, gestionnaire, comptable).",
    category: "settings",
    icon: Users,
    steps: [
      "Allez dans « Paramètres » puis l'onglet « Utilisateurs & rôles ».",
      "Cliquez sur « Ajouter un utilisateur » pour créer un compte collaborateur.",
      "Attribuez un rôle : Administrateur (accès complet), Gestionnaire (opérations courantes) ou Comptable (lecture finances).",
      "Le collaborateur reçoit ses identifiants par email.",
    ],
  },
  {
    id: "enable-mfa",
    title: "Activer la double authentification (2FA)",
    summary: "Sécurisez votre compte avec un code TOTP via Google Authenticator ou Authy.",
    category: "security",
    icon: Shield,
    steps: [
      "Allez dans « Paramètres » puis l'onglet « Sécurité ».",
      "Cliquez sur « Activer la 2FA ».",
      "Scannez le QR code avec votre application d'authentification (Google Authenticator, Authy…).",
      "Entrez le code à 6 chiffres pour confirmer l'activation.",
      "À chaque connexion, un code sera demandé en plus de votre mot de passe.",
    ],
  },
  {
    id: "end-lease",
    title: "Mettre fin à un bail",
    summary: "Initiez la procédure de fin de bail avec calcul automatique du solde.",
    category: "tenants",
    icon: Users,
    steps: [
      "Ouvrez la fiche du locataire concerné.",
      "Cliquez sur « Fin de bail » pour démarrer la procédure.",
      "Choisissez la raison du départ et la durée du préavis (1, 2, 3 ou 6 mois).",
      "Le système calcule automatiquement le solde : loyers restants, caution, pénalités éventuelles.",
      "Validez la clôture — l'unité repasse en statut « Vacant ».",
    ],
  },
  {
    id: "late-fees",
    title: "Configurer les pénalités de retard",
    summary: "Activez le calcul automatique de pénalités pour les loyers en retard.",
    category: "settings",
    icon: Settings,
    steps: [
      "Allez dans « Paramètres » puis l'onglet « Finance ».",
      "Activez l'option « Pénalités de retard ».",
      "Choisissez le type (montant fixe ou pourcentage du loyer).",
      "Définissez le nombre de jours de grâce avant application.",
      "Les pénalités sont calculées automatiquement sur les loyers en retard.",
    ],
  },
];

export default function Help() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);

  const filtered = useMemo(() => {
    return ARTICLES.filter((a) => {
      const matchCategory = activeCategory === "all" || a.category === activeCategory;
      const matchSearch =
        !search ||
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.summary.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [search, activeCategory]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Centre d'aide</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Retrouvez des guides pas-à-pas pour utiliser toutes les fonctionnalités de RentFlow.
          </p>
        </div>

        {/* CTA Tour guidé */}
        <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-foreground">Nouveau sur RentFlow ?</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Lancez le tour guidé pour configurer la plateforme étape par étape : bien, unités, locataire, loyers…
            </p>
          </div>
          <Button onClick={() => setTourOpen(true)} className="gap-2 shrink-0 self-stretch sm:self-auto">
            Démarrer le tour <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article…"
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Articles */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucun article trouvé pour cette recherche.
            </div>
          )}

          {filtered.map((article) => {
            const Icon = article.icon;
            const isOpen = openArticle === article.id;
            const catLabel = CATEGORIES.find((c) => c.key === article.category)?.label;

            return (
              <div
                key={article.id}
                className="rounded-xl border border-border bg-card overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenArticle(isOpen ? null : article.id)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{article.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{article.summary}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0 hidden sm:inline-flex">
                    {catLabel}
                  </Badge>
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="ml-[52px] space-y-3">
                      <p className="text-sm text-muted-foreground">{article.summary}</p>
                      <ol className="space-y-2">
                        {article.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <GuidedTour open={tourOpen} onOpenChange={setTourOpen} />
    </AppLayout>
  );
}
