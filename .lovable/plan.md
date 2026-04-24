

## Envoi groupé SMS — `BulkSmsDialog` sur Rents & Tenants

Ajout d'un composant d'envoi groupé multi-étapes avec prévisualisation par destinataire, intégré aux pages Rents (cible : impayés) et Tenants (cible : locataires actifs), avec verrouillage par plan.

### 1. Nouveau composant `BulkSmsDialog`

`src/components/sms/BulkSmsDialog.tsx` — dialog en 3 étapes :

**Étape 1 — Sélection des destinataires**
- Liste des cibles passées en prop (`recipients: { tenantId, name, phone, rentPaymentId?, rentAmount?, dueDate? }[]`).
- Cases à cocher individuelles + "Tout sélectionner".
- Filtre automatique des destinataires sans téléphone (badge "Sans numéro" désactivé).

**Étape 2 — Modèle & contenu**
- Choix du modèle SMS (depuis `sms_templates` de l'organisation) ou message libre.
- Variables supportées : `{{tenant_name}}`, `{{rent_amount}}`, `{{due_date}}`, `{{agency_name}}`.
- Compteur caractères/segments en temps réel.

**Étape 3 — Prévisualisation & confirmation**
- Aperçu rendu pour les 3 premiers destinataires (variables substituées).
- Récap : nombre de destinataires × segments = total SMS.
- Bouton "Confirmer l'envoi" → insertion en lot dans `sms_messages` (status `scheduled`, `scheduled_for: now()`, `trigger_type: 'manual'`), puis appel `sms-send` pour chaque message.
- Toast de progression + fermeture à la fin.

### 2. Intégration `Rents.tsx`

- Nouveau bouton header **"Relancer les impayés"** (icône `MessageSquare`).
- Visible uniquement si au moins un loyer `late` ou `pending` avec téléphone.
- Cibles pré-remplies : tous les loyers non payés avec tenant + phone.
- Verrou : `sms_bulk_send` requis. Sans ce flag → bouton ouvre `FeatureLockedCard` modale (upgrade Pro).

### 3. Intégration `Tenants.tsx`

- Nouveau bouton header **"Envoyer SMS groupé"**.
- Cibles pré-remplies : locataires actifs avec téléphone (filtre courant respecté si l'utilisateur a appliqué un filtre ville/bien/risque).
- Même logique de verrou `sms_bulk_send`.

### 4. Gating (feature flag)

Réutilisation de `useFeatureAccess()` :
- `hasFeature("sms_bulk_send")` → autorise l'envoi groupé.
- Si absent : bouton affiché en grisé avec icône cadenas, clic ouvre une modale `UpgradePrompt` réutilisant `FeatureLockedCard` (titre "Envoi groupé", plan requis "Pro").

Aucune migration DB requise — le flag `sms_bulk_send` sera ajouté manuellement aux plans Pro+ via l'admin (ou via update SQL ponctuel si tu le demandes ensuite).

### Détails techniques

**Fichier créé :**
- `src/components/sms/BulkSmsDialog.tsx`

**Fichiers modifiés :**
- `src/pages/Rents.tsx` — bouton "Relancer les impayés" + state `bulkOpen`
- `src/pages/Tenants.tsx` — bouton "Envoyer SMS groupé" + state `bulkOpen`

**Logique d'envoi (extrait) :**
```ts
// Insertion en lot
const rows = selected.map(r => ({
  organization_id: orgId,
  recipient_phone: r.phone,
  recipient_name: r.name,
  content: render(template, varsFor(r)),
  tenant_id: r.tenantId,
  rent_payment_id: r.rentPaymentId ?? null,
  trigger_type: "manual",
  status: "scheduled",
  scheduled_for: new Date().toISOString(),
}));
const { data: msgs } = await supabase.from("sms_messages").insert(rows).select("id");
// Déclenche immédiatement
await Promise.all(msgs.map(m => 
  supabase.functions.invoke("sms-send", { body: { sms_message_id: m.id } })
));
```

**Pas de changement** sur les edge functions (Phase 1A déjà compatible : `sms-send` accepte `sms_message_id`).

