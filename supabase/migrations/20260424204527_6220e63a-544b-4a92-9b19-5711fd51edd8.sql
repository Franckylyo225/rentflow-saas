-- 1. Add new columns to sms_schedules
ALTER TABLE public.sms_schedules
  ADD COLUMN IF NOT EXISTS day_of_month SMALLINT,
  ADD COLUMN IF NOT EXISTS send_hour SMALLINT NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS send_minute SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slot_index SMALLINT;

-- 2. Backfill day_of_month and slot_index from existing offset_days
-- Use the org's rent_due_day (default 5) as base
UPDATE public.sms_schedules s
SET 
  day_of_month = GREATEST(1, LEAST(28, COALESCE(o.rent_due_day, 5) + s.offset_days)),
  slot_index = CASE 
    WHEN s.offset_days = -5 THEN 1
    WHEN s.offset_days = -1 THEN 2
    WHEN s.offset_days = 3 THEN 3
    ELSE COALESCE(s.sort_order, 1)
  END,
  send_hour = 9,
  send_minute = 0
FROM public.organizations o
WHERE s.organization_id = o.id
  AND s.day_of_month IS NULL;

-- 3. Set defaults for any remaining rows
UPDATE public.sms_schedules
SET day_of_month = 1, slot_index = COALESCE(sort_order, 1)
WHERE day_of_month IS NULL;

-- 4. Make columns NOT NULL with constraints
ALTER TABLE public.sms_schedules
  ALTER COLUMN day_of_month SET NOT NULL,
  ALTER COLUMN day_of_month SET DEFAULT 1,
  ALTER COLUMN slot_index SET NOT NULL,
  ALTER COLUMN slot_index SET DEFAULT 1;

-- 5. Add CHECK constraints
ALTER TABLE public.sms_schedules
  DROP CONSTRAINT IF EXISTS sms_schedules_day_of_month_check,
  DROP CONSTRAINT IF EXISTS sms_schedules_send_hour_check,
  DROP CONSTRAINT IF EXISTS sms_schedules_send_minute_check,
  DROP CONSTRAINT IF EXISTS sms_schedules_slot_index_check;

ALTER TABLE public.sms_schedules
  ADD CONSTRAINT sms_schedules_day_of_month_check CHECK (day_of_month BETWEEN 1 AND 31),
  ADD CONSTRAINT sms_schedules_send_hour_check CHECK (send_hour BETWEEN 0 AND 23),
  ADD CONSTRAINT sms_schedules_send_minute_check CHECK (send_minute BETWEEN 0 AND 59),
  ADD CONSTRAINT sms_schedules_slot_index_check CHECK (slot_index BETWEEN 1 AND 3);

-- 6. Index for fast lookup by hour/day
CREATE INDEX IF NOT EXISTS idx_sms_schedules_dispatch
  ON public.sms_schedules (day_of_month, send_hour, is_active);

-- 7. Update plans: remove sms_bulk_send and sms_before_only
UPDATE public.plans
SET feature_flags = array_remove(array_remove(feature_flags, 'sms_bulk_send'), 'sms_before_only')
WHERE slug IN ('starter', 'pro', 'business');

-- 8. Update handle_new_user and ensure_user_profile to initialize the new columns
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
  _full_name TEXT;
  _tpl_before UUID;
  _tpl_after UUID;
BEGIN
  invite := NEW.raw_user_meta_data->>'invite_token';
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');

  IF invite IS NOT NULL AND invite != '' THEN
    SELECT id INTO existing_org_id FROM public.organizations WHERE invite_token = invite LIMIT 1;
    IF existing_org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid invitation token';
    END IF;

    INSERT INTO public.profiles (user_id, organization_id, full_name, email, is_approved)
    VALUES (NEW.id, existing_org_id, _full_name, NEW.email, false);

    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'gestionnaire');

    RETURN NEW;
  END IF;

  INSERT INTO public.organizations (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon entreprise'),
    NEW.email
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name, email, is_approved)
  VALUES (NEW.id, new_org_id, _full_name, NEW.email, true);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  INSERT INTO public.subscriptions (organization_id, plan, status, trial_ends_at)
  VALUES (new_org_id, 'starter', 'trial', now() + interval '7 days');

  INSERT INTO public.cities (name, organization_id) VALUES
    ('Abidjan', new_org_id), ('Bouaké', new_org_id), ('Yamoussoukro', new_org_id),
    ('San-Pédro', new_org_id), ('Daloa', new_org_id), ('Korhogo', new_org_id);

  -- SMS templates par défaut
  INSERT INTO public.sms_templates (organization_id, template_key, label, content, is_system) VALUES
    (new_org_id, 'reminder_before', 'Rappel avant échéance', 'Bonjour {{tenant_name}}, votre loyer de {{rent_amount}} FCFA est dû le {{due_date}}. Cordialement, {{agency_name}}.', true),
    (new_org_id, 'reminder_after', 'Relance après échéance', 'Bonjour {{tenant_name}}, votre loyer de {{rent_amount}} FCFA était dû le {{due_date}}. Merci de régulariser. {{agency_name}}.', true),
    (new_org_id, 'manual', 'Message manuel', 'Bonjour {{tenant_name}}, ', true);

  -- SMS schedules par défaut : 3 créneaux préconfigurés
  SELECT id INTO _tpl_before FROM public.sms_templates WHERE organization_id = new_org_id AND template_key = 'reminder_before' LIMIT 1;
  SELECT id INTO _tpl_after FROM public.sms_templates WHERE organization_id = new_org_id AND template_key = 'reminder_after' LIMIT 1;

  INSERT INTO public.sms_schedules (organization_id, offset_days, label, template_id, sort_order, slot_index, day_of_month, send_hour, send_minute, is_active) VALUES
    (new_org_id, -5, 'Rappel avant échéance', _tpl_before, 1, 1, 1, 9, 0, true),
    (new_org_id, -1, 'Rappel veille échéance', _tpl_before, 2, 2, 4, 9, 0, false),
    (new_org_id, 3, 'Relance après échéance', _tpl_after, 3, 3, 8, 9, 0, false);

  INSERT INTO public.expense_categories (organization_id, name, is_default) VALUES
    (new_org_id, 'Maintenance', true), (new_org_id, 'Réparations', true),
    (new_org_id, 'Sécurité', true), (new_org_id, 'Nettoyage', true),
    (new_org_id, 'Salaires personnel', true), (new_org_id, 'Électricité / Eau', true),
    (new_org_id, 'Taxes', true), (new_org_id, 'Assurance', true), (new_org_id, 'Autres', true);

  INSERT INTO public.custom_roles (organization_id, name, base_role, permissions, is_system) VALUES
    (new_org_id, 'Administrateur', 'admin', ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports','edit_settings','manage_users'], true),
    (new_org_id, 'Gestionnaire', 'gestionnaire', ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports'], true),
    (new_org_id, 'Comptable', 'comptable', ARRAY['view_dashboard','view_rents','view_expenses','view_reports'], true);

  INSERT INTO public.contract_templates (organization_id, name, template_type, is_default, content) VALUES
    (new_org_id, 'Contrat de bail — Personne physique', 'individual', true,
     '<h1 style="text-align:center">CONTRAT DE BAIL</h1><hr/><p>Bailleur : <strong>{{agency_name}}</strong></p><p>Locataire : <strong>{{tenant_name}}</strong></p><p>Bien : <strong>{{unit_name}}</strong> dans "<strong>{{property_name}}</strong>"</p><p>Du <strong>{{start_date}}</strong> au <strong>{{end_date}}</strong></p><p>Loyer : <strong>{{rent_amount}} FCFA</strong>/mois</p>'),
    (new_org_id, 'Contrat de bail — Entreprise', 'company', true,
     '<h1 style="text-align:center">CONTRAT DE BAIL COMMERCIAL</h1><hr/><p>Bailleur : <strong>{{agency_name}}</strong></p><p>Locataire : <strong>{{tenant_name}}</strong></p><p>Bien : <strong>{{unit_name}}</strong> dans "<strong>{{property_name}}</strong>"</p><p>Du <strong>{{start_date}}</strong> au <strong>{{end_date}}</strong></p><p>Loyer : <strong>{{rent_amount}} FCFA</strong>/mois</p>');

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID;
  _email TEXT;
  _full_name TEXT;
  _company_name TEXT;
  _invite TEXT;
  _existing_profile_id UUID;
  _new_org_id UUID;
  _existing_org_id UUID;
  _tpl_before UUID;
  _tpl_after UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT id INTO _existing_profile_id FROM public.profiles WHERE user_id = _user_id;
  IF _existing_profile_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'exists');
  END IF;

  SELECT
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
    COALESCE(u.raw_user_meta_data->>'company_name', 'Mon agence'),
    COALESCE(u.raw_user_meta_data->>'invite_token', '')
  INTO _email, _full_name, _company_name, _invite
  FROM auth.users u WHERE u.id = _user_id;

  IF _invite IS NOT NULL AND _invite != '' THEN
    SELECT id INTO _existing_org_id FROM public.organizations WHERE invite_token = _invite LIMIT 1;
    IF _existing_org_id IS NOT NULL THEN
      INSERT INTO public.profiles (user_id, organization_id, full_name, email, is_approved)
      VALUES (_user_id, _existing_org_id, _full_name, _email, false);
      INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'gestionnaire');
      RETURN jsonb_build_object('status', 'created', 'type', 'invite');
    END IF;
  END IF;

  INSERT INTO public.organizations (name, email)
  VALUES (_company_name, _email)
  RETURNING id INTO _new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name, email, is_approved)
  VALUES (_user_id, _new_org_id, _full_name, _email, true);

  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin');

  INSERT INTO public.subscriptions (organization_id, plan, status, trial_ends_at)
  VALUES (_new_org_id, 'starter', 'trial', now() + interval '7 days');

  INSERT INTO public.cities (name, organization_id) VALUES
    ('Abidjan', _new_org_id), ('Bouaké', _new_org_id), ('Yamoussoukro', _new_org_id),
    ('San-Pédro', _new_org_id), ('Daloa', _new_org_id), ('Korhogo', _new_org_id);

  INSERT INTO public.sms_templates (organization_id, template_key, label, content, is_system) VALUES
    (_new_org_id, 'reminder_before', 'Rappel avant échéance', 'Bonjour {{tenant_name}}, votre loyer de {{rent_amount}} FCFA est dû le {{due_date}}. Cordialement, {{agency_name}}.', true),
    (_new_org_id, 'reminder_after', 'Relance après échéance', 'Bonjour {{tenant_name}}, votre loyer de {{rent_amount}} FCFA était dû le {{due_date}}. Merci de régulariser. {{agency_name}}.', true),
    (_new_org_id, 'manual', 'Message manuel', 'Bonjour {{tenant_name}}, ', true);

  SELECT id INTO _tpl_before FROM public.sms_templates WHERE organization_id = _new_org_id AND template_key = 'reminder_before' LIMIT 1;
  SELECT id INTO _tpl_after FROM public.sms_templates WHERE organization_id = _new_org_id AND template_key = 'reminder_after' LIMIT 1;

  INSERT INTO public.sms_schedules (organization_id, offset_days, label, template_id, sort_order, slot_index, day_of_month, send_hour, send_minute, is_active) VALUES
    (_new_org_id, -5, 'Rappel avant échéance', _tpl_before, 1, 1, 1, 9, 0, true),
    (_new_org_id, -1, 'Rappel veille échéance', _tpl_before, 2, 2, 4, 9, 0, false),
    (_new_org_id, 3, 'Relance après échéance', _tpl_after, 3, 3, 8, 9, 0, false);

  INSERT INTO public.expense_categories (organization_id, name, is_default) VALUES
    (_new_org_id, 'Maintenance', true), (_new_org_id, 'Réparations', true),
    (_new_org_id, 'Sécurité', true), (_new_org_id, 'Nettoyage', true),
    (_new_org_id, 'Salaires personnel', true), (_new_org_id, 'Électricité / Eau', true),
    (_new_org_id, 'Taxes', true), (_new_org_id, 'Assurance', true), (_new_org_id, 'Autres', true);

  INSERT INTO public.custom_roles (organization_id, name, base_role, permissions, is_system) VALUES
    (_new_org_id, 'Administrateur', 'admin', ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports','edit_settings','manage_users'], true),
    (_new_org_id, 'Gestionnaire', 'gestionnaire', ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports'], true),
    (_new_org_id, 'Comptable', 'comptable', ARRAY['view_dashboard','view_rents','view_expenses','view_reports'], true);

  INSERT INTO public.contract_templates (organization_id, name, template_type, is_default, content) VALUES
    (_new_org_id, 'Contrat de bail — Personne physique', 'individual', true,
     '<h1 style="text-align:center">CONTRAT DE BAIL</h1><hr/><p>Bailleur : <strong>{{agency_name}}</strong></p><p>Locataire : <strong>{{tenant_name}}</strong></p><p>Bien : <strong>{{unit_name}}</strong></p><p>Loyer : <strong>{{rent_amount}} FCFA</strong>/mois</p>'),
    (_new_org_id, 'Contrat de bail — Entreprise', 'company', true,
     '<h1 style="text-align:center">CONTRAT DE BAIL COMMERCIAL</h1><hr/><p>Bailleur : <strong>{{agency_name}}</strong></p><p>Locataire : <strong>{{tenant_name}}</strong></p><p>Loyer : <strong>{{rent_amount}} FCFA</strong>/mois</p>');

  RETURN jsonb_build_object('status', 'created', 'type', 'new_org');
END;
$function$;