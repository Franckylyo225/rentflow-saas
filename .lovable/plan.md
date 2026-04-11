

## Plan: Indicateur d'abonnement dans la barre latérale

### Objectif
Ajouter entre la navigation et le bloc utilisateur un encart compact affichant :
- Le nom du plan en cours (ex: "Starter", "Pro")
- Le nombre de jours restants (essai ou abonnement)
- Un bouton "Renouveler" visible quand il reste ≤ 20 jours

### Modifications

**1. `src/components/layout/AppSidebar.tsx`**
- Importer `usePlanLimits` et les composants nécessaires (`Badge`, `Button`, `Crown`/`CreditCard` icon)
- Ajouter un bloc entre `</nav>` et le bloc User (ligne 95) :
  - Badge avec le nom du plan
  - Texte "X jours restants" (ou "Expiré" si ≤ 0)
  - Couleur adaptative : vert si > 20j, orange si ≤ 20j, rouge si expiré
  - Bouton "Renouveler" (lien vers `/settings` onglet abonnement) affiché quand `daysUntilExpiry ≤ 20`

### Détails techniques
- `usePlanLimits` fournit déjà `planName`, `daysUntilExpiry`, `expired`, `subscriptionStatus`
- Seuils d'alerte : ≤ 20 jours → bouton visible, ≤ 15 jours → style urgence (rouge/orange)
- Le bouton redirige vers `/settings` avec un paramètre pour ouvrir l'onglet Abonnement

