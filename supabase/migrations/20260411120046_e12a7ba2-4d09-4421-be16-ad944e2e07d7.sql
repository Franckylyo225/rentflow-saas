
-- Table for editable platform email templates
CREATE TABLE public.platform_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  label text NOT NULL,
  subject text NOT NULL DEFAULT '',
  html_content text NOT NULL DEFAULT '',
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access on platform_email_templates"
  ON public.platform_email_templates FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER update_platform_email_templates_updated_at
  BEFORE UPDATE ON public.platform_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.platform_email_templates (template_key, label, subject, description, html_content) VALUES
(
  'signup-confirmation',
  'Confirmation d''inscription',
  'Bienvenue sur SCI Binieba !',
  'Envoyé aux nouveaux utilisateurs après leur inscription',
  '<div style="font-family:''Inter'',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Bienvenue sur SCI Binieba</h1></div><div style="padding:32px 24px"><p style="color:#1a1a2e;font-size:16px;line-height:1.6">Bonjour{{#name}} <strong>{{name}}</strong>{{/name}},</p><p style="color:#555;font-size:14px;line-height:1.6">Votre compte a été créé avec succès. Vous pouvez maintenant accéder à votre espace de gestion locative.</p><div style="text-align:center;margin:32px 0"><a href="https://rent-flow.net/dashboard" style="background:hsl(160,84%,39%);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Accéder à mon espace</a></div><p style="color:#999;font-size:12px;line-height:1.5">Si vous n''avez pas créé ce compte, vous pouvez ignorer cet email.</p></div><div style="background:#f8f8f8;padding:16px 24px;text-align:center"><p style="color:#999;font-size:11px;margin:0">© 2025 SCI Binieba — Gestion locative simplifiée</p></div></div>'
),
(
  'new-user-admin',
  'Notification nouvel utilisateur (Admin)',
  'Nouvel utilisateur : {{email}}',
  'Envoyé à l''admin SaaS quand un nouvel utilisateur s''inscrit',
  '<div style="font-family:''Inter'',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Nouvelle inscription</h1></div><div style="padding:32px 24px"><p style="color:#1a1a2e;font-size:16px;line-height:1.6">Un nouvel utilisateur s''est inscrit sur la plateforme :</p><div style="background:#f4faf7;border:1px solid hsl(160,60%,90%);border-radius:8px;padding:16px;margin:16px 0"><p style="margin:4px 0;color:#333;font-size:14px"><strong>Nom :</strong> {{name}}</p><p style="margin:4px 0;color:#333;font-size:14px"><strong>Email :</strong> {{email}}</p><p style="margin:4px 0;color:#333;font-size:14px"><strong>Organisation :</strong> {{organization}}</p></div><div style="text-align:center;margin:24px 0"><a href="https://rent-flow.net/admin/users" style="background:hsl(160,84%,39%);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Voir dans l''admin</a></div></div><div style="background:#f8f8f8;padding:16px 24px;text-align:center"><p style="color:#999;font-size:11px;margin:0">SCI Binieba — Notification admin</p></div></div>'
),
(
  'payment-confirmation',
  'Confirmation de paiement',
  'Paiement confirmé — {{amount}} FCFA',
  'Envoyé au client après un paiement d''abonnement',
  '<div style="font-family:''Inter'',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Paiement confirmé</h1></div><div style="padding:32px 24px"><p style="color:#1a1a2e;font-size:16px;line-height:1.6">Bonjour{{#name}} <strong>{{name}}</strong>{{/name}},</p><p style="color:#555;font-size:14px;line-height:1.6">Votre paiement a été enregistré avec succès.</p><div style="background:#f4faf7;border:1px solid hsl(160,60%,90%);border-radius:8px;padding:16px;margin:16px 0"><p style="margin:4px 0;color:#333;font-size:14px"><strong>Plan :</strong> {{plan}}</p><p style="margin:4px 0;color:#333;font-size:14px"><strong>Montant :</strong> {{amount}} FCFA</p><p style="margin:4px 0;color:#333;font-size:14px"><strong>Période :</strong> {{period}}</p></div><div style="text-align:center;margin:24px 0"><a href="https://rent-flow.net/settings" style="background:hsl(160,84%,39%);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Voir mon abonnement</a></div></div><div style="background:#f8f8f8;padding:16px 24px;text-align:center"><p style="color:#999;font-size:11px;margin:0">© 2025 SCI Binieba — Gestion locative simplifiée</p></div></div>'
),
(
  'payment-admin',
  'Notification paiement (Admin)',
  'Paiement reçu : {{organization}} — {{amount}} FCFA',
  'Envoyé à l''admin lors d''un paiement d''abonnement',
  '<div style="font-family:''Inter'',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden"><div style="background:hsl(160,84%,39%);padding:32px 24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">Paiement reçu</h1></div><div style="padding:32px 24px"><p style="color:#1a1a2e;font-size:16px;line-height:1.6">Un paiement d''abonnement a été enregistré :</p><div style="background:#f4faf7;border:1px solid hsl(160,60%,90%);border-radius:8px;padding:16px;margin:16px 0"><p style="margin:4px 0;color:#333;font-size:14px"><strong>Organisation :</strong> {{organization}}</p><p style="margin:4px 0;color:#333;font-size:14px"><strong>Plan :</strong> {{plan}}</p><p style="margin:4px 0;color:#333;font-size:14px"><strong>Montant :</strong> {{amount}} FCFA</p></div><div style="text-align:center;margin:24px 0"><a href="https://rent-flow.net/admin/transactions" style="background:hsl(160,84%,39%);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block">Voir les transactions</a></div></div><div style="background:#f8f8f8;padding:16px 24px;text-align:center"><p style="color:#999;font-size:11px;margin:0">SCI Binieba — Notification admin</p></div></div>'
);
