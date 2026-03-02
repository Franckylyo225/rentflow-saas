
-- Custom roles with fine-grained permissions
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_role public.app_role NOT NULL DEFAULT 'gestionnaire',
  permissions text[] NOT NULL DEFAULT '{}',
  city_ids uuid[] NOT NULL DEFAULT '{}',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org custom_roles"
  ON public.custom_roles FOR SELECT
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin can manage custom_roles"
  ON public.custom_roles FOR ALL
  USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()))
  WITH CHECK (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- Link users to custom roles + optional city restrictions
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS custom_role_id uuid REFERENCES public.custom_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city_ids uuid[] NOT NULL DEFAULT '{}';

-- Seed default system roles for existing organizations
INSERT INTO public.custom_roles (organization_id, name, base_role, permissions, is_system)
SELECT o.id, 'Administrateur', 'admin',
  ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports','edit_settings','manage_users'],
  true
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.custom_roles cr WHERE cr.organization_id = o.id AND cr.base_role = 'admin' AND cr.is_system = true);

INSERT INTO public.custom_roles (organization_id, name, base_role, permissions, is_system)
SELECT o.id, 'Gestionnaire', 'gestionnaire',
  ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports'],
  true
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.custom_roles cr WHERE cr.organization_id = o.id AND cr.base_role = 'gestionnaire' AND cr.is_system = true);

INSERT INTO public.custom_roles (organization_id, name, base_role, permissions, is_system)
SELECT o.id, 'Comptable', 'comptable',
  ARRAY['view_dashboard','view_rents','view_expenses','view_reports'],
  true
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.custom_roles cr WHERE cr.organization_id = o.id AND cr.base_role = 'comptable' AND cr.is_system = true);

-- Update handle_new_user to also create default custom roles for new orgs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon entreprise'),
    NEW.email
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name, email)
  VALUES (NEW.id, new_org_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  INSERT INTO public.cities (name, organization_id) VALUES
    ('Abidjan', new_org_id), ('Bouaké', new_org_id), ('Yamoussoukro', new_org_id),
    ('San-Pédro', new_org_id), ('Daloa', new_org_id), ('Korhogo', new_org_id);

  INSERT INTO public.notification_templates (organization_id, template_key, label, sms_content, email_content) VALUES
    (new_org_id, 'before_5', 'Rappel J-5', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA est dû le {{date_echeance}}.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA est dû le {{date_echeance}}.\n\nCordialement'),
    (new_org_id, 'after_1', 'Relance J+1', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA était dû hier.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA était dû le {{date_echeance}}.\n\nCordialement'),
    (new_org_id, 'after_7', 'Relance J+7', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA est en retard de 7 jours.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA est en retard de 7 jours.\n\nCordialement');

  INSERT INTO public.expense_categories (organization_id, name, is_default) VALUES
    (new_org_id, 'Maintenance', true),
    (new_org_id, 'Réparations', true),
    (new_org_id, 'Sécurité', true),
    (new_org_id, 'Nettoyage', true),
    (new_org_id, 'Salaires personnel', true),
    (new_org_id, 'Électricité / Eau', true),
    (new_org_id, 'Taxes', true),
    (new_org_id, 'Assurance', true),
    (new_org_id, 'Autres', true);

  -- Default custom roles
  INSERT INTO public.custom_roles (organization_id, name, base_role, permissions, is_system) VALUES
    (new_org_id, 'Administrateur', 'admin', ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports','edit_settings','manage_users'], true),
    (new_org_id, 'Gestionnaire', 'gestionnaire', ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports'], true),
    (new_org_id, 'Comptable', 'comptable', ARRAY['view_dashboard','view_rents','view_expenses','view_reports'], true);

  RETURN NEW;
END;
$$;
