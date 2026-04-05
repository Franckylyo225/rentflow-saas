

# Plan : Onboarding guidé avec choix de formule

## Contexte actuel

Aujourd'hui, l'inscription crée directement une organisation avec le plan "starter" par defaut (trigger `handle_new_user`). Il n'y a pas d'etape de choix de plan ni de parcours d'accueil guiede. La subscription n'est meme pas cree automatiquement -- elle est absente pour les nouvelles orgs.

## Vue d'ensemble

Creer un parcours d'onboarding multi-etapes apres la premiere connexion d'un nouvel utilisateur admin. Ce parcours sera une page dediee `/onboarding` qui guide l'utilisateur a travers :

1. **Bienvenue** -- message d'accueil personnalise
2. **Choix du plan** -- grille des plans dynamiques (depuis la table `plans`)
3. **Configuration de l'organisation** -- nom, coordonnees, logo
4. **Confirmation** -- recapitulatif et redirection vers le dashboard

## Etapes techniques

### 1. Migration DB : creer la subscription a l'inscription

Modifier le trigger `handle_new_user` pour inserer automatiquement une ligne dans `subscriptions` avec `status = 'trial'`, `plan = 'starter'`, et `trial_ends_at = now() + 14 days`.

Ajouter une colonne `onboarding_completed` (boolean, default false) sur la table `organizations`.

### 2. Nouvelle page `/onboarding` (src/pages/Onboarding.tsx)

Un composant multi-etapes avec un stepper visuel :

```text
[1. Bienvenue] → [2. Choisir un plan] → [3. Mon organisation] → [4. C'est parti !]
```

- **Etape 1 - Bienvenue** : Texte d'accueil avec le nom de l'utilisateur, breve presentation des fonctionnalites.
- **Etape 2 - Choix du plan** : Recupere les plans depuis `plans` (is_visible=true). Affiche les cartes avec prix, limites et features. Le plan selectionne met a jour `subscriptions.plan` pour l'organisation.
- **Etape 3 - Configuration** : Formulaire pour completer le profil de l'organisation (nom legal, adresse, telephone, logo upload vers le bucket `logos`). Pre-remplit avec les donnees existantes.
- **Etape 4 - Confirmation** : Recapitulatif du plan choisi + infos organisation. Bouton "Acceder a mon espace" qui marque `onboarding_completed = true` et redirige vers `/dashboard`.

### 3. Routage et garde

- Ajouter la route `/onboarding` dans `App.tsx` (protegee).
- Dans `ProtectedRoute`, apres le check MFA et approval : si `organization.onboarding_completed === false` et que l'utilisateur a le role `admin`, rediriger vers `/onboarding`.
- La page `/onboarding` elle-meme redirige vers `/dashboard` si l'onboarding est deja fait.

### 4. Mise a jour du hook useProfile

Ajouter `onboarding_completed` au type `Organization` et a la requete de `useProfile` pour que le `ProtectedRoute` puisse verifier cette valeur.

### 5. Mise a jour de la subscription au choix du plan

Lors de l'etape 2, quand l'utilisateur selectionne un plan, faire un `upsert` sur `subscriptions` pour mettre a jour le `plan` slug. Cela necessite une politique RLS permettant aux admins de mettre a jour leur propre subscription (ou une edge function).

**Option retenue** : Ajouter une RLS policy `INSERT` + `UPDATE` sur `subscriptions` pour les admins de l'organisation concernee (via `is_org_admin` + `organization_id = get_user_org_id`).

## Fichiers concernes

| Fichier | Action |
|---|---|
| Migration SQL | Ajouter `onboarding_completed` sur `organizations`, modifier `handle_new_user` pour creer subscription, ajouter RLS sur subscriptions |
| `src/pages/Onboarding.tsx` | Creer -- page multi-etapes |
| `src/App.tsx` | Ajouter route `/onboarding` |
| `src/components/auth/ProtectedRoute.tsx` | Ajouter redirection onboarding |
| `src/hooks/useProfile.ts` | Ajouter `onboarding_completed` au type Organization |

## UX attendue

- Design coherent avec la page Auth existante (Framer Motion, meme esthetique)
- Stepper horizontal avec progression visuelle
- Animations fluides entre les etapes
- Responsive mobile
- Le parcours est obligatoire une seule fois pour le createur de l'organisation
- Les utilisateurs invites (via token) ne passent pas par l'onboarding

