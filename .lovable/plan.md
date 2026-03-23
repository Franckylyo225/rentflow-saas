

## Plan : Ajouter un champ "Sender Name" configurable dans les paramètres

### Contexte
L'edge function `send-sms` accepte déjà un `senderName` optionnel. Il faut ajouter une colonne en base pour le stocker au niveau de l'organisation, l'exposer dans l'onglet Général des paramètres, et l'utiliser lors de l'envoi SMS.

### Étapes

**1. Migration : ajouter la colonne `sms_sender_name`**
- Ajouter `sms_sender_name TEXT DEFAULT 'SCI Binieba'` à la table `organizations`.

**2. Mettre à jour le hook `useOrganizationSettings`**
- Ajouter `sms_sender_name: string` à l'interface `OrganizationSettings`.

**3. Ajouter le champ dans `GeneralTab.tsx`**
- Ajouter un champ "Nom d'expéditeur SMS" dans la carte "Informations de l'entreprise" avec une description explicative (ex: "Nom affiché comme expéditeur des SMS envoyés").
- Inclure `sms_sender_name` dans le formulaire et la sauvegarde.

**4. Utiliser le sender name dans `NotificationsTab.tsx`**
- Lors de l'envoi de SMS test et des relances, récupérer `sms_sender_name` depuis les settings de l'organisation et le passer comme `senderName` à l'edge function.

### Fichiers impactés
- Migration SQL (nouvelle colonne)
- `src/hooks/useOrganizationSettings.ts`
- `src/components/settings/GeneralTab.tsx`
- `src/components/settings/NotificationsTab.tsx`

