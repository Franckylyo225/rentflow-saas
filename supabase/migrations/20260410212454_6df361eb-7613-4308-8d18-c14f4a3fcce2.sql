-- Add new columns to plans
ALTER TABLE public.plans 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS display_features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cta_label text NOT NULL DEFAULT 'Commencer l''essai',
  ADD COLUMN IF NOT EXISTS trial_eligible boolean NOT NULL DEFAULT true;

-- Migrate is_visible to status
UPDATE public.plans SET status = CASE WHEN is_visible = true THEN 'active' ELSE 'hidden' END;

-- Create features table
CREATE TABLE public.features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view features" ON public.features FOR SELECT USING (true);
CREATE POLICY "Super admins can manage features" ON public.features FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Seed default features
INSERT INTO public.features (key, label, description, sort_order) VALUES
  ('properties', 'Gestion des biens', 'Créer et gérer les biens immobiliers et unités locatives', 1),
  ('tenants', 'Gestion des locataires', 'Gérer les fiches locataires et contrats de bail', 2),
  ('rents', 'Suivi des loyers', 'Suivre les échéances et encaissements de loyers', 3),
  ('email_reminders', 'Rappels email', 'Relances automatiques par email avant et après échéance', 4),
  ('digital_receipts', 'Quittances numériques', 'Générer et télécharger les quittances de loyer en PDF', 5),
  ('expenses', 'Suivi des dépenses', 'Enregistrer et catégoriser les dépenses par bien', 6),
  ('reports', 'Rapports financiers', 'Rapports et analyses financières avancées', 7),
  ('sms_reminders', 'Rappels SMS', 'Relances automatiques par SMS', 8),
  ('patrimoine', 'Gestion du patrimoine', 'Suivi des actifs immobiliers et fonciers', 9),
  ('employees', 'Gestion des employés', 'Suivi du personnel et génération des charges salariales', 10),
  ('property_sales', 'Module ventes immobilières', 'Gérer les ventes de biens immobiliers', 11),
  ('api_access', 'Accès API', 'Intégration via API REST', 12),
  ('priority_support', 'Support prioritaire', 'Assistance prioritaire et dédiée', 13)
ON CONFLICT (key) DO NOTHING;

-- Create waitlist table
CREATE TABLE public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  plan_slug text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (email, plan_slug)
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert waitlist" ON public.waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Super admins can view waitlist" ON public.waitlist FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete waitlist" ON public.waitlist FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Update existing plans with display_features
UPDATE public.plans SET 
  display_features = ARRAY[
    'Jusqu''à ' || COALESCE(max_properties::text, '∞') || ' unités',
    COALESCE(max_users::text, '∞') || ' utilisateur' || CASE WHEN COALESCE(max_users, 2) > 1 THEN 's' ELSE '' END,
    'Gestion des biens',
    'Gestion des locataires', 
    'Suivi des loyers',
    'Rappels email',
    'Quittances numériques',
    'Suivi des dépenses',
    'Rapports de base'
  ],
  cta_label = 'Commencer gratuitement',
  trial_eligible = true
WHERE slug = 'starter';

UPDATE public.plans SET 
  display_features = ARRAY[
    'Jusqu''à ' || COALESCE(max_properties::text, '∞') || ' unités',
    COALESCE(max_users::text, '∞') || ' utilisateurs',
    'Gestion des biens',
    'Gestion des locataires',
    'Suivi des loyers',
    'Suivi des dépenses',
    'Rappels email + SMS',
    'Rapports financiers',
    'Gestion du patrimoine',
    'Gestion des employés',
    'Module ventes immobilières'
  ],
  status = 'coming_soon',
  cta_label = 'Bientôt disponible',
  trial_eligible = false
WHERE slug = 'pro';

UPDATE public.plans SET 
  status = 'hidden'
WHERE slug = 'enterprise';