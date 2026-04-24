-- ============================================================
-- PHASE 1 — REFONTE COMPLÈTE DU SYSTÈME SMS
-- ============================================================

-- 1. SUPPRESSION DES ANCIENNES TABLES
DROP TABLE IF EXISTS public.sms_history CASCADE;
DROP TABLE IF EXISTS public.notification_templates CASCADE;

-- ============================================================
-- 2. NOUVELLE TABLE : sms_templates
-- ============================================================
CREATE TABLE public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  label TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, template_key)
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org sms_templates"
ON public.sms_templates FOR SELECT TO authenticated
USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin can manage sms_templates"
ON public.sms_templates FOR ALL TO authenticated
USING (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()))
WITH CHECK (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

-- Empêcher la suppression des templates système
CREATE OR REPLACE FUNCTION public.prevent_system_template_deletion()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'Les modèles système ne peuvent pas être supprimés';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_sms_system_template_deletion
BEFORE DELETE ON public.sms_templates
FOR EACH ROW EXECUTE FUNCTION public.prevent_system_template_deletion();

CREATE TRIGGER update_sms_templates_updated_at
BEFORE UPDATE ON public.sms_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. NOUVELLE TABLE : sms_schedules
-- ============================================================
CREATE TABLE public.sms_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  offset_days INTEGER NOT NULL,
  label TEXT NOT NULL,
  template_id UUID REFERENCES public.sms_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org sms_schedules"
ON public.sms_schedules FOR SELECT TO authenticated
USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin can manage sms_schedules"
ON public.sms_schedules FOR ALL TO authenticated
USING (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()))
WITH CHECK (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER update_sms_schedules_updated_at
BEFORE UPDATE ON public.sms_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. NOUVELLE TABLE : sms_messages
-- ============================================================
CREATE TABLE public.sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  rent_payment_id UUID REFERENCES public.rent_payments(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.sms_templates(id) ON DELETE SET NULL,
  schedule_id UUID REFERENCES public.sms_schedules(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  content TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  provider_message_id TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour le worker CRON (récupération des SMS à envoyer)
CREATE INDEX idx_sms_messages_status_scheduled
ON public.sms_messages (status, scheduled_for)
WHERE status IN ('scheduled', 'pending');

CREATE INDEX idx_sms_messages_org_created
ON public.sms_messages (organization_id, created_at DESC);

-- Anti-doublon pour les envois automatiques
CREATE UNIQUE INDEX uq_sms_messages_auto_unique
ON public.sms_messages (rent_payment_id, schedule_id)
WHERE trigger_type = 'auto' AND rent_payment_id IS NOT NULL AND schedule_id IS NOT NULL;

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org sms_messages"
ON public.sms_messages FOR SELECT TO authenticated
USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Gestionnaire/admin can insert sms_messages"
ON public.sms_messages FOR INSERT TO authenticated
WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Gestionnaire/admin can update sms_messages"
ON public.sms_messages FOR UPDATE TO authenticated
USING (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()))
WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER update_sms_messages_updated_at
BEFORE UPDATE ON public.sms_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. NOUVELLE TABLE : sms_logs
-- ============================================================
CREATE TABLE public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_message_id UUID NOT NULL REFERENCES public.sms_messages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_logs_message ON public.sms_logs (sms_message_id, created_at DESC);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org sms_logs"
ON public.sms_logs FOR SELECT TO authenticated
USING (sms_message_id IN (
  SELECT id FROM public.sms_messages
  WHERE organization_id = get_user_org_id(auth.uid())
));

-- ============================================================
-- 6. MISE À JOUR DES FONCTIONS DE CRÉATION DE PROFIL
-- ============================================================
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
  _tpl_default UUID;
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

  -- SMS schedules par défaut (J-5, J-1, J+3)
  SELECT id INTO _tpl_default FROM public.sms_templates WHERE organization_id = new_org_id AND template_key = 'reminder_before' LIMIT 1;
  INSERT INTO public.sms_schedules (organization_id, offset_days, label, template_id, sort_order) VALUES
    (new_org_id, -5, 'Rappel J-5', _tpl_default, 1),
    (new_org_id, -1, 'Rappel J-1', _tpl_default, 2);

  SELECT id INTO _tpl_default FROM public.sms_templates WHERE organization_id = new_org_id AND template_key = 'reminder_after' LIMIT 1;
  INSERT INTO public.sms_schedules (organization_id, offset_days, label, template_id, sort_order) VALUES
    (new_org_id, 3, 'Relance J+3', _tpl_default, 3);

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
  _tpl_default UUID;
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

  -- SMS templates par défaut
  INSERT INTO public.sms_templates (organization_id, template_key, label, content, is_system) VALUES
    (_new_org_id, 'reminder_before', 'Rappel avant échéance', 'Bonjour {{tenant_name}}, votre loyer de {{rent_amount}} FCFA est dû le {{due_date}}. Cordialement, {{agency_name}}.', true),
    (_new_org_id, 'reminder_after', 'Relance après échéance', 'Bonjour {{tenant_name}}, votre loyer de {{rent_amount}} FCFA était dû le {{due_date}}. Merci de régulariser. {{agency_name}}.', true),
    (_new_org_id, 'manual', 'Message manuel', 'Bonjour {{tenant_name}}, ', true);

  -- SMS schedules par défaut
  SELECT id INTO _tpl_default FROM public.sms_templates WHERE organization_id = _new_org_id AND template_key = 'reminder_before' LIMIT 1;
  INSERT INTO public.sms_schedules (organization_id, offset_days, label, template_id, sort_order) VALUES
    (_new_org_id, -5, 'Rappel J-5', _tpl_default, 1),
    (_new_org_id, -1, 'Rappel J-1', _tpl_default, 2);

  SELECT id INTO _tpl_default FROM public.sms_templates WHERE organization_id = _new_org_id AND template_key = 'reminder_after' LIMIT 1;
  INSERT INTO public.sms_schedules (organization_id, offset_days, label, template_id, sort_order) VALUES
    (_new_org_id, 3, 'Relance J+3', _tpl_default, 3);

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

-- ============================================================
-- 7. SEED des organisations existantes (templates + schedules)
-- ============================================================
DO $$
DECLARE
  org_rec RECORD;
  tpl_before UUID;
  tpl_after UUID;
BEGIN
  FOR org_rec IN SELECT id FROM public.organizations LOOP
    -- Templates
    INSERT INTO public.sms_templates (organization_id, template_key, label, content, is_system) VALUES
      (org_rec.id, 'reminder_before', 'Rappel avant échéance', 'Bonjour {{tenant_name}}, votre loyer de {{rent_amount}} FCFA est dû le {{due_date}}. Cordialement, {{agency_name}}.', true),
      (org_rec.id, 'reminder_after', 'Relance après échéance', 'Bonjour {{tenant_name}}, votre loyer de {{rent_amount}} FCFA était dû le {{due_date}}. Merci de régulariser. {{agency_name}}.', true),
      (org_rec.id, 'manual', 'Message manuel', 'Bonjour {{tenant_name}}, ', true)
    ON CONFLICT (organization_id, template_key) DO NOTHING;

    SELECT id INTO tpl_before FROM public.sms_templates WHERE organization_id = org_rec.id AND template_key = 'reminder_before' LIMIT 1;
    SELECT id INTO tpl_after FROM public.sms_templates WHERE organization_id = org_rec.id AND template_key = 'reminder_after' LIMIT 1;

    -- Schedules
    INSERT INTO public.sms_schedules (organization_id, offset_days, label, template_id, sort_order) VALUES
      (org_rec.id, -5, 'Rappel J-5', tpl_before, 1),
      (org_rec.id, -1, 'Rappel J-1', tpl_before, 2),
      (org_rec.id, 3, 'Relance J+3', tpl_after, 3);
  END LOOP;
END $$;

-- ============================================================
-- 8. FEATURE FLAGS pour gating des plans
-- ============================================================
INSERT INTO public.features (key, label, description, sort_order) VALUES
  ('sms_auto_basic', 'Rappel SMS automatique basique', 'Une seule échéance automatique (J-5)', 100),
  ('sms_auto_full', 'Rappels SMS automatiques complets', 'Plusieurs échéances configurables (J-5, J-1, J+3...)', 101),
  ('sms_templates_edit', 'Édition des modèles SMS', 'Personnaliser le contenu des modèles SMS', 102),
  ('sms_manual_send', 'Envoi SMS manuel', 'Envoyer un SMS à un locataire à la demande', 103),
  ('sms_bulk_send', 'Envoi SMS groupé', 'Envoyer un SMS à plusieurs locataires (filtres)', 104),
  ('sms_schedule', 'Planification SMS', 'Programmer un SMS à une date/heure précise', 105),
  ('sms_custom_scenarios', 'Scénarios SMS personnalisés', 'Créer des scénarios sur mesure', 106),
  ('sms_conditional_logic', 'Logique conditionnelle SMS', 'Conditions du type "si impayé alors envoyer X"', 107),
  ('sms_multi_agency', 'Gestion SMS multi-agences', 'Envoi et gestion à travers plusieurs agences', 108)
ON CONFLICT (key) DO NOTHING;