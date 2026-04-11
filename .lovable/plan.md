

# Mise à jour de l'adresse d'expéditeur

Modification simple de l'Edge Function `send-rent-reminders` pour remplacer `onboarding@resend.dev` par `noreply@rent-flow.net`.

## Changement

**Fichier** : `supabase/functions/send-rent-reminders/index.ts`

Remplacer la ligne qui construit l'adresse d'expéditeur :
- Avant : `${senderName} <onboarding@resend.dev>`
- Après : `${senderName} <noreply@rent-flow.net>`

Un seul fichier modifié, redéploiement automatique de la fonction.

