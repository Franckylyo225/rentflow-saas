-- 1. Ajouter colonnes email sur sms_schedules
ALTER TABLE public.sms_schedules
  ADD COLUMN IF NOT EXISTS send_email BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_template_id UUID NULL;

-- 2. Créer la table email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  label TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, template_key)
);

-- FK email_template_id → email_templates
ALTER TABLE public.sms_schedules
  DROP CONSTRAINT IF EXISTS sms_schedules_email_template_id_fkey;
ALTER TABLE public.sms_schedules
  ADD CONSTRAINT sms_schedules_email_template_id_fkey
  FOREIGN KEY (email_template_id) REFERENCES public.email_templates(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org email_templates" ON public.email_templates;
CREATE POLICY "Users can view org email_templates"
ON public.email_templates FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

DROP POLICY IF EXISTS "Admin can manage email_templates" ON public.email_templates;
CREATE POLICY "Admin can manage email_templates"
ON public.email_templates FOR ALL
TO authenticated
USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger anti-suppression modèles système
DROP TRIGGER IF EXISTS prevent_email_system_template_deletion ON public.email_templates;
CREATE TRIGGER prevent_email_system_template_deletion
BEFORE DELETE ON public.email_templates
FOR EACH ROW EXECUTE FUNCTION public.prevent_system_template_deletion();

-- 3. Backfill : 2 modèles email par défaut pour chaque agence existante
INSERT INTO public.email_templates (organization_id, template_key, label, subject, html_content, is_system)
SELECT 
  o.id,
  'reminder_before',
  'Rappel avant échéance',
  'Rappel : votre loyer arrive à échéance',
  '<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:hsl(160,84%,39%);padding:24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:22px">Rappel d''échéance</h1></div><div style="padding:32px 24px;color:#1a1a2e"><p>Bonjour <strong>{{tenant_name}}</strong>,</p><p>Nous vous rappelons que votre loyer de <strong>{{rent_amount}} FCFA</strong> est dû le <strong>{{due_date}}</strong>.</p><p>Merci de procéder au règlement dans les délais.</p><p style="margin-top:24px;color:#555">Cordialement,<br/><strong>{{agency_name}}</strong></p></div></div>',
  true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates et 
  WHERE et.organization_id = o.id AND et.template_key = 'reminder_before'
);

INSERT INTO public.email_templates (organization_id, template_key, label, subject, html_content, is_system)
SELECT 
  o.id,
  'reminder_after',
  'Relance après échéance',
  'Relance : loyer en retard',
  '<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:hsl(0,72%,51%);padding:24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:22px">Loyer en retard</h1></div><div style="padding:32px 24px;color:#1a1a2e"><p>Bonjour <strong>{{tenant_name}}</strong>,</p><p>Votre loyer de <strong>{{rent_amount}} FCFA</strong> était dû le <strong>{{due_date}}</strong> et n''a pas encore été réglé.</p><p>Merci de régulariser votre situation dans les meilleurs délais.</p><p style="margin-top:24px;color:#555">Cordialement,<br/><strong>{{agency_name}}</strong></p></div></div>',
  true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates et 
  WHERE et.organization_id = o.id AND et.template_key = 'reminder_after'
);

-- 4. Mettre à jour handle_new_user et ensure_user_profile pour créer ces modèles aux nouvelles agences
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
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon entreprise'), NEW.email)
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name, email, is_approved)
  VALUES (NEW.id, new_org_id, _full_name, NEW.email, true);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  INSERT INTO public.subscriptions (organization_id, plan, status, trial_ends_at)
  VALUES (new_org_id, 'starter', 'trial', now() + interval '7 days');
  INSERT INTO public.cities (name, organization_id) VALUES
    ('Abidjan', new_org_id), ('Bouaké', new_org_id), ('Yamoussoukro', new_org_id),
    ('San-Pédro', new_org_id), ('Daloa', new_org_id), ('Korhogo', new_org_id);

  INSERT INTO public.sms_templates (organization_id, template_key, label, content, is_system) VALUES
    (new_org_id, 'reminder_before', 'Rappel avant échéance', 'Bonjour {{tenant_name}}, votre loyer de {{rent_amount}} FCFA est dû le {{due_date}}. Cordialement, {{agency_name}}.', true),
    (new_org_id, 'reminder_after', 'Relance après échéance', 'Bonjour {{tenant_name}}, votre loyer de {{rent_amount}} FCFA était dû le {{due_date}}. Merci de régulariser. {{agency_name}}.', true),
    (new_org_id, 'manual', 'Message manuel', 'Bonjour {{tenant_name}}, ', true);

  -- Email templates par défaut
  INSERT INTO public.email_templates (organization_id, template_key, label, subject, html_content, is_system) VALUES
    (new_org_id, 'reminder_before', 'Rappel avant échéance', 'Rappel : votre loyer arrive à échéance',
     '<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:hsl(160,84%,39%);padding:24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:22px">Rappel d''échéance</h1></div><div style="padding:32px 24px;color:#1a1a2e"><p>Bonjour <strong>{{tenant_name}}</strong>,</p><p>Nous vous rappelons que votre loyer de <strong>{{rent_amount}} FCFA</strong> est dû le <strong>{{due_date}}</strong>.</p><p>Merci de procéder au règlement dans les délais.</p><p style="margin-top:24px;color:#555">Cordialement,<br/><strong>{{agency_name}}</strong></p></div></div>', true),
    (new_org_id, 'reminder_after', 'Relance après échéance', 'Relance : loyer en retard',
     '<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:hsl(0,72%,51%);padding:24px;text-align:center"><h1 style="color:#fff;margin:0;font-size:22px">Loyer en retard</h1></div><div style="padding:32px 24px;color:#1a1a2e"><p>Bonjour <strong>{{tenant_name}}</strong>,</p><p>Votre loyer de <strong>{{rent_amount}} FCFA</strong> était dû le <strong>{{due_date}}</strong> et n''a pas encore été réglé.</p><p>Merci de régulariser votre situation dans les meilleurs délais.</p><p style="margin-top:24px;color:#555">Cordialement,<br/><strong>{{agency_name}}</strong></p></div></div>', true);

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
    (new_org_id, 'Contrat de bail — Personne physique', 'individual', true, '<h1 style="text-align:center">CONTRAT DE BAIL</h1><hr/><p>Bailleur : <strong>{{agency_name}}</strong></p>'),
    (new_org_id, 'Contrat de bail — Entreprise', 'company', true, '<h1 style="text-align:center">CONTRAT DE BAIL COMMERCIAL</h1><hr/><p>Bailleur : <strong>{{agency_name}}</strong></p>');

  RETURN NEW;
END;
$function$;