

# Relances email automatiques via Resend

## Résumé
Créer une Edge Function cron qui vérifie quotidiennement les loyers à venir/en retard et envoie des emails de relance (J-5, J+1, J+7) via Resend, en utilisant les modèles configurés dans `notification_templates`.

## Architecture

```text
pg_cron (quotidien)
  → Edge Function "send-rent-reminders"
    → Requête rent_payments (pending/late) + tenants (email)
    → Calcul J-5 / J+1 / J+7 par rapport à due_date
    → Remplacement variables {{nom}}, {{montant}}, {{date_echeance}}
    → Envoi via Resend (connector gateway)
    → Log dans table email_reminder_logs
```

## Étapes

### 1. Migration : table `email_reminder_logs`
Table pour éviter les doublons et tracer les envois :
- `id`, `rent_payment_id`, `template_key`, `recipient_email`, `status`, `error_message`, `sent_at`
- Contrainte unique sur `(rent_payment_id, template_key)` pour ne pas renvoyer le même rappel
- RLS : lecture par les membres de l'organisation

### 2. Edge Function `send-rent-reminders`
Fonction backend qui :
1. Récupère les `notification_templates` où `email_enabled = true` par organisation
2. Pour chaque template (before_5, after_1, after_7), calcule la date cible :
   - `before_5` : loyers avec `due_date = today + 5 jours` et `status = 'pending'`
   - `after_1` : loyers avec `due_date = today - 1 jour` et `status IN ('pending', 'late')`
   - `after_7` : loyers avec `due_date = today - 7 jours` et `status IN ('pending', 'late')`
3. Joint avec `tenants` pour obtenir l'email du locataire
4. Vérifie que le rappel n'a pas déjà été envoyé (`email_reminder_logs`)
5. Remplace les variables `{{nom}}`, `{{montant}}`, `{{date_echeance}}`
6. Envoie via le connector gateway Resend
7. Log le résultat

### 3. Cron job pg_cron
Planification quotidienne (ex: 7h00 UTC) via `cron.schedule` pour appeler la Edge Function.

### 4. UI : indicateur dans NotificationsTab
Ajout d'un compteur "X emails envoyés ce mois" et d'un lien vers un historique des relances envoyées.

## Détails techniques
- **Resend via gateway** : `POST https://connector-gateway.lovable.dev/resend/emails` avec les headers `Authorization: Bearer $LOVABLE_API_KEY` et `X-Connection-Api-Key: $RESEND_API_KEY`
- **Domaine d'envoi** : L'utilisateur devra configurer un domaine vérifié dans Resend. En attendant, `onboarding@resend.dev` sera utilisé pour les tests.
- **Sécurité** : La fonction utilise `SUPABASE_SERVICE_ROLE_KEY` pour accéder aux données, validé en code.

## Note sur le domaine personnalisé
Pour envoyer depuis votre propre domaine (ex: `relances@votredomaine.com`), vous devrez :
1. Ajouter votre domaine dans le dashboard Resend
2. Configurer les enregistrements DNS (SPF, DKIM, DMARC) indiqués par Resend
3. Mettre à jour l'adresse d'expéditeur dans la Edge Function

