## Fonctionnalité Early Adopters — Plan d'implémentation

Fonctionnalité complète touchant **3 zones** : Admin, Dashboard utilisateur, Landing page publique.

---

### 1. Base de données (migration Supabase)

**Tables :**
- `early_adopter_config` (key/value store) avec RLS : lecture publique, écriture super admin uniquement
- `early_adopters` (id, user_id, email, joined_at, discount_percent, free_months, is_active, applied_at, notes) avec RLS : lecture par le user concerné + super admins, écriture super admin

**Données initiales** : insertion des 11 clés de config (active=true, total_slots=100, slots_taken=77, etc.)

**Fonctions/Triggers :**
- Trigger `on_auth_user_created_early_adopter` sur `auth.users` → appelle fonction qui :
  - vérifie config `active='true'` et `slots_taken < total_slots`
  - insère dans `early_adopters`
  - incrémente `slots_taken`
- RPC `get_user_early_adopter_status(user_id)` → `{ is_early_adopter, discount_percent, free_months, joined_at }`
- RPC `get_early_adopter_public_config()` → expose les champs publics nécessaires à la landing

---

### 2. Page admin `/admin/early-adopters`

**Sidebar admin** : ajout d'un item "Early Adopters" (icône Sparkles) dans `SuperAdminLayout`.

**Page `src/pages/admin/AdminEarlyAdopters.tsx`** :
- Topbar avec badge dynamique (vert/gris selon `active`)
- **Section Configuration** : toggle programme actif (avec modal de confirmation), inputs édit. inline pour total_slots, discount_percent (avec preview prix temps réel), free_months, price_before, label, description, expires_at. Bouton "Enregistrer"
- **Section Compteur** : 3 KPIs (places prises avec couleur dynamique, places restantes, taux de remplissage avec Progress) + champ ajustement manuel
- **Section Liste** : table paginée (20/page) avec recherche email, avatar+email, date, %, mois, badge statut, actions Révoquer/Restaurer, export CSV
- **Section Ajout manuel** : email + % + mois + note, bouton Ajouter

**Route** : ajout dans `App.tsx` sous `SuperAdminRoute`.

---

### 3. Edge Function `apply-early-adopter-discount`

Déclenchée via trigger DB après insert sur `auth.users`. Le trigger côté SQL gère l'attribution. L'edge function envoie l'email de bienvenue (via Brevo si `BREVO_API_KEY` configuré, sinon utilise l'infrastructure email Lovable existante en fallback).

**Note** : Le projet utilise déjà MonSMS pour SMS et a `RESEND_API_KEY`. Je propose d'utiliser **Resend** (déjà connecté) plutôt que d'ajouter Brevo, sauf si demandé explicitement.

---

### 4. Dashboard utilisateur

**Sidebar (`AppSidebar`)** : juste **ajouter un badge "Early Adopter -X%"** au footer existant si l'utilisateur est early adopter (hook `useEarlyAdopterStatus`).

**Page Settings → onglet Abonnement** : ajout d'une card "Votre statut Early Adopter" si applicable.

---

### 5. Landing page — composant `<EarlyAdopterCTA />`

Nouveau composant `src/components/landing/EarlyAdopterCTA.tsx` qui :
- Lit la config publique via RPC `get_early_adopter_public_config()`
- Affiche le bloc complet (header sombre, compteur places restantes vert citron, message urgence, décrémenteur live, 4 avantages, prix, avatars, CTA)
- Si `active=false` ou places=0 → fallback section pricing standard

**Intégration** : remplace le contenu de la section "Pionniers" dans `RealEstateSalesSection` ou crée un emplacement dédié dans `Landing.tsx`.

---

### 6. Hook partagé

`src/hooks/useEarlyAdopterStatus.ts` : retourne `{ isEarlyAdopter, discountPercent, freeMonths, joinedAt, loading }` via la RPC.

---

### Points à confirmer avant implémentation

1. **Email de bienvenue** : utiliser **Resend** (déjà connecté au projet) au lieu de Brevo ? Ou ajouter vraiment Brevo ?
2. **"Super admin"** : le projet a déjà la table `super_admins` et le hook `useSuperAdmin` — je l'utilise (pas les metadata Supabase comme demandé).
3. **Section "Pionniers" sur la landing** : la section actuelle s'appelle `RealEstateSalesSection` — confirmer si je la remplace ou j'ajoute le composant ailleurs (entre `PricingSection` et `TestimonialsSection` semble naturel).

Je peux démarrer dès approbation.
