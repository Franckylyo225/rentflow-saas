# Plan d'implémentation — SMS simplifié et automatisé

## 🎯 Objectif

Remplacer le système actuel (offset_days + envoi manuel groupé) par un système **100% automatique** où chaque agence configure :
- **Starter** : 1 SMS/mois (modèle + jour + heure)
- **Pro/Business** : 3 SMS/mois (modèle + jour + heure pour chacun)

---

## 1. Migration base de données

**Schéma `sms_schedules`** :
- ➕ `day_of_month` SMALLINT (1-31, contraint par trigger)
- ➕ `send_hour` SMALLINT (0-23, défaut 9)
- ➕ `send_minute` SMALLINT (0-59, défaut 0)
- ➕ `slot_index` SMALLINT (1, 2 ou 3) → identifie le créneau Pro
- 🔄 `offset_days` reste pour compatibilité descendante (sera ignoré par la nouvelle logique)

**Backfill des données existantes** (21 lignes) :
- `Rappel J-5` → `day_of_month = (rent_due_day - 5)` clampé entre 1 et 28, `slot_index = 1`
- `Rappel J-1` → `day_of_month = (rent_due_day - 1)`, `slot_index = 2`
- `Relance J+3` → `day_of_month = (rent_due_day + 3)`, `slot_index = 3`
- `send_hour = 9`, `send_minute = 0` partout

**Plans (mise à jour `feature_flags`)** :
- 🗑 Retirer `sms_bulk_send` de Pro et Business
- 🗑 Retirer `sms_before_only` (devenu inutile)
- ✅ Garder `sms_auto_basic` (Starter = 1 SMS) et `sms_auto_full` (Pro/Business = 3 SMS)

## 2. Edge function `sms-generate-reminders`

Réécriture complète de la logique de matching :
- Cron passe de **quotidien** à **horaire** (`0 * * * *`)
- Pour chaque schedule actif : si `day_of_month == today.day` ET `send_hour == current_hour`, alors générer
- Le SMS est envoyé pour chaque locataire actif ayant un loyer pour le mois courant (statut `pending`, `late` ou `partial`)
- Anti-doublon : clé unique (`schedule_id` + `tenant_id` + `month YYYY-MM`)
- Limitation par plan :
  - Starter (`sms_auto_basic` sans `sms_auto_full`) : seul `slot_index = 1` est traité
  - Pro/Business (`sms_auto_full`) : les 3 slots sont traités

## 3. Cron job

Mettre à jour le cron `pg_cron` existant pour `sms-generate-reminders` : passer de `0 6 * * *` (quotidien) à `0 * * * *` (horaire).

## 4. Refonte UI `SmsSchedulesEditor.tsx`

Nouvelle interface **inline** sans dialog de création :
- 1 ligne fixe pour Starter, 3 lignes fixes pour Pro/Business
- Chaque ligne = `Switch actif | Select modèle | Select jour 1-31 | Select heure HH:MM`
- Bouton "Enregistrer" global
- Pour Starter, les slots 2 et 3 sont affichés grisés avec badge "Pro"
- Suppression du bouton "Ajouter" et du dialog

Ajustements `SmsSettingsTab.tsx` : retirer la logique `canEditAllSchedules` séparée — la nouvelle UI gère tout via `slot_index`.

## 5. Suppression de l'envoi manuel groupé

- 🗑 **Supprimer** `src/components/sms/BulkSmsDialog.tsx`
- 🗑 **Rents.tsx** : retirer le DropdownMenu "Relances SMS" (et l'import BulkSmsDialog). Garder éventuellement un raccourci vers Settings → SMS.
- 🗑 **Tenants.tsx** : retirer le bouton "SMS groupé" et l'import BulkSmsDialog
- ✅ Conserver `SendSmsDialog.tsx` (envoi individuel sur fiche locataire — utile pour cas exceptionnels)

## 6. Mise à jour mémoire projet

Mettre à jour `mem://features/relances-automatiques` pour refléter la nouvelle règle (jour + heure choisis par l'agence, plus d'envoi manuel groupé).

---

## ⚠️ Impacts à confirmer

- **Compatibilité** : la colonne `offset_days` reste présente mais n'est plus lue par l'edge function. Aucune perte de données.
- **Locataire test "Konan Test"** créé précédemment : restera fonctionnel pour valider le nouveau cron horaire.
- **`SendSmsDialog`** (envoi unitaire depuis fiche locataire) : conservé car utile, pas concerné par la simplification.

Confirmes-tu ce plan avant que je passe en mode implémentation ?