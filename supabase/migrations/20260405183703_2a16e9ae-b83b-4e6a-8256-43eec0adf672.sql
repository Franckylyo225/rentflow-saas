
-- 1. Add onboarding_completed to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. Replace handle_new_user to also create a subscription with 7-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  invite TEXT;
  existing_org_id UUID;
BEGIN
  invite := NEW.raw_user_meta_data->>'invite_token';

  IF invite IS NOT NULL AND invite != '' THEN
    SELECT id INTO existing_org_id FROM public.organizations WHERE invite_token = invite LIMIT 1;
    IF existing_org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid invitation token';
    END IF;

    INSERT INTO public.profiles (user_id, organization_id, full_name, email, is_approved)
    VALUES (NEW.id, existing_org_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, false);

    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'gestionnaire');

    RETURN NEW;
  END IF;

  -- Normal signup: create new org, auto-approved admin
  INSERT INTO public.organizations (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon entreprise'),
    NEW.email
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name, email, is_approved)
  VALUES (NEW.id, new_org_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, true);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  -- Create trial subscription (7 days)
  INSERT INTO public.subscriptions (organization_id, plan, status, trial_ends_at)
  VALUES (new_org_id, 'starter', 'trial', now() + interval '7 days');

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

  INSERT INTO public.custom_roles (organization_id, name, base_role, permissions, is_system) VALUES
    (new_org_id, 'Administrateur', 'admin', ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports','edit_settings','manage_users'], true),
    (new_org_id, 'Gestionnaire', 'gestionnaire', ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports'], true),
    (new_org_id, 'Comptable', 'comptable', ARRAY['view_dashboard','view_rents','view_expenses','view_reports'], true);

  RETURN NEW;
END;
$function$;

-- 3. RLS: Allow org admins to update their own subscription (for plan selection during onboarding)
CREATE POLICY "Org admin can update own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()))
WITH CHECK (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

-- 4. RLS: Allow org admins to insert subscription (fallback for orgs without one)
CREATE POLICY "Org admin can insert own subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));
