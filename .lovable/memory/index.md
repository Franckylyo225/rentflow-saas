# Memory: index.md
Updated: today

# Project Memory

## Core
Loca.ci (ex-RentFlow) — Gestion locative SaaS multi-tenant. FCFA, Côte d'Ivoire / Afrique de l'Ouest.
Domaine actuel : rent-flow.net (migration vers loca.ci prévue plus tard). Logo : public/logo-horizontal.png.
SMS via MonSMS Pro. Email via Resend, expéditeur "Loca.ci <noreply@rent-flow.net>".
Secrets : MONSMS_API_KEY, MONSMS_COMPANY_ID, RESEND_API_KEY.
Relances unifiées : chaque créneau SMS peut aussi déclencher un email (toggle send_email + email_template_id sur sms_schedules). Starter = 1 créneau, Pro/Business = 3.

## Memories
- [Identité Loca.ci](mem://branding/identity) — Nom, logo, domaine, expéditeur email
- [SMS MonSMS Pro](mem://constraints/sms-disabled) — Fournisseur SMS actif
- [Intégration MonSMS Pro](mem://integrations/sms-monsms-pro) — Config API endpoint
