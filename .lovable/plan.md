

## Envoi automatique de la quittance par email lors du paiement

### Objectif
Quand un loyer passe au statut **"Payé"**, envoyer automatiquement un email au locataire avec la quittance PDF en pièce jointe.

### Déclenchement
Dans `handleRecordPayment` (src/pages/Rents.tsx), juste après que `newStatus === "paid"` soit confirmé et la mise à jour `rent_payments` réussie. L'envoi se fait en arrière-plan (non bloquant) avec un toast de confirmation séparé. Si le locataire n'a pas d'email, on saute silencieusement l'envoi (toast info).

### Flux technique

```text
Paiement enregistré (status=paid)
        │
        ▼
Génération PDF côté client (getQuittanceBlob)
        │
        ▼
Conversion Blob → base64
        │
        ▼
supabase.functions.invoke("send-quittance-email", {
   recipientEmail, tenantName, month, amount,
   organizationName, pdfBase64, pdfFilename
})
        │
        ▼
Edge Function → Resend API (via gateway Lovable)
        │
        ▼
Email HTML + attachment PDF → locataire
        │
        ▼
Log dans email_reminder_logs (status=sent/failed)
```

### Détails techniques

**1. Nouvelle Edge Function `send-quittance-email`**
- Accepte : `recipientEmail`, `tenantName`, `month` (texte ex: "avril 2026"), `amount`, `organizationName`, `pdfBase64`, `pdfFilename`.
- Construit un HTML branded (cohérent avec les templates existants — vert RentFlow, mêmes styles que `send-email`).
- Sujet : `Votre quittance de loyer — {{month}}`.
- Appelle le gateway Resend avec le champ `attachments: [{ filename, content: pdfBase64 }]` (Resend accepte du base64).
- Logue l'envoi dans `email_reminder_logs` (template_key = `quittance_auto`, status = `sent` ou `failed`).
- CORS + gestion d'erreurs standard.

**2. Modification de `src/pages/Rents.tsx`**
- Après `await supabase.from("rent_payments").update(...)`, si `newStatus === "paid"` ET `selectedPayment.tenants?.email` présent :
  - Construire le `QuittanceData` (même structure que `openQuittance`).
  - `const blob = await getQuittanceBlob(data)`.
  - Convertir en base64 (via `FileReader.readAsDataURL`, strip du préfixe `data:...;base64,`).
  - `supabase.functions.invoke("send-quittance-email", { body: {...} })`.
  - Toast succès : "Quittance envoyée à {email}" / toast warning si pas d'email.
- L'envoi est `await`-é mais entouré d'un `try/catch` pour ne jamais bloquer la fermeture du dialog ou le `refetch()`.

**3. Aucune modification DB requise**
- Réutilisation de la table `email_reminder_logs` existante.
- Pas de nouveau secret (Resend déjà configuré, `LOVABLE_API_KEY` et `RESEND_API_KEY` présents).

### Comportements & garde-fous
- **Pas d'email locataire** → l'enregistrement du paiement réussit, toast info "Paiement enregistré (locataire sans email, quittance non envoyée)".
- **Échec d'envoi** → le paiement reste valide, toast warning "Paiement enregistré, échec envoi quittance" + log en DB.
- **Paiement partiel devenant complet** : la quittance est envoyée uniquement quand le statut passe à `paid` (pas sur `partial`).
- **Pas de doublon** : si on rejoue un paiement déjà payé, pas de ré-envoi (le statut était déjà `paid`).

### Fichiers impactés
- ➕ `supabase/functions/send-quittance-email/index.ts` (nouveau)
- ✏️ `src/pages/Rents.tsx` (logique d'envoi dans `handleRecordPayment`)

