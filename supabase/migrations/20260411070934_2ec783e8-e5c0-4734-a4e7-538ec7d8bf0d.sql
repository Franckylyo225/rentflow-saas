
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

  INSERT INTO public.organizations (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon entreprise'),
    NEW.email
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name, email, is_approved)
  VALUES (NEW.id, new_org_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, true);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

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

  -- Default contract templates
  INSERT INTO public.contract_templates (organization_id, name, template_type, is_default, content) VALUES
    (new_org_id, 'Contrat de bail — Personne physique', 'individual', true,
     '<h1 style="text-align:center">CONTRAT DE BAIL</h1><hr/><h2>ENTRE LES SOUSSIGNES</h2><p>Le bailleur : <strong>{{agency_name}}</strong>, ci-après dénommé "LE BAILLEUR",</p><p><strong>ET</strong></p><p>Le locataire : <strong>{{tenant_name}}</strong>, téléphone : {{tenant_phone}}, ci-après dénommé "LE LOCATAIRE",</p><h2>Article 1 — Objet du bail</h2><p>Le bailleur donne en location au locataire le bien désigné : <strong>{{unit_name}}</strong>, situé dans la propriété "<strong>{{property_name}}</strong>". Le bien est loué à usage d''habitation.</p><h2>Article 2 — Durée du bail</h2><p>Le présent bail est consenti pour une durée prenant effet le <strong>{{start_date}}</strong> et se terminant le <strong>{{end_date}}</strong>. À l''expiration, le bail sera renouvelé par tacite reconduction.</p><h2>Article 3 — Loyer</h2><p>Le loyer mensuel est fixé à la somme de <strong>{{rent_amount}} FCFA</strong>, payable d''avance.</p><h2>Article 4 — Dépôt de garantie</h2><p>Le locataire verse au bailleur un dépôt de garantie. Ce dépôt sera restitué en fin de bail, déduction faite des sommes éventuellement dues.</p><h2>Article 5 — Obligations du locataire</h2><p>Le locataire s''engage à : payer le loyer aux termes convenus ; user des lieux en bon père de famille ; ne pas sous-louer sans accord écrit du bailleur ; signaler toute dégradation.</p><h2>Article 6 — Obligations du bailleur</h2><p>Le bailleur s''engage à : délivrer les lieux en bon état ; assurer une jouissance paisible ; effectuer les réparations nécessaires.</p><h2>Article 7 — Résiliation</h2><p>Le bail pourra être résilié en cas de non-paiement du loyer, un mois après mise en demeure restée infructueuse.</p><h2>Article 8 — Litiges</h2><p>En cas de litige, les parties s''engagent à rechercher une solution amiable. À défaut, le litige sera soumis aux tribunaux compétents.</p><br/><p><strong>LE BAILLEUR</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>LE LOCATAIRE</strong></p><p>{{agency_name}} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {{tenant_name}}</p><p>Signature : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Signature :</p>'),
    (new_org_id, 'Contrat de bail — Entreprise', 'company', true,
     '<h1 style="text-align:center">CONTRAT DE BAIL COMMERCIAL</h1><hr/><h2>ENTRE LES SOUSSIGNES</h2><p>Le bailleur : <strong>{{agency_name}}</strong>, ci-après dénommé "LE BAILLEUR",</p><p><strong>ET</strong></p><p>La société <strong>{{tenant_name}}</strong>, téléphone : {{tenant_phone}}, ci-après dénommée "LE LOCATAIRE",</p><h2>Article 1 — Objet du bail</h2><p>Le bailleur donne en location au locataire le bien désigné : <strong>{{unit_name}}</strong>, situé dans la propriété "<strong>{{property_name}}</strong>". Le bien est loué à usage professionnel/commercial.</p><h2>Article 2 — Durée du bail</h2><p>Le présent bail est consenti pour une durée prenant effet le <strong>{{start_date}}</strong> et se terminant le <strong>{{end_date}}</strong>. À l''expiration, le bail sera renouvelé par tacite reconduction.</p><h2>Article 3 — Loyer</h2><p>Le loyer mensuel est fixé à la somme de <strong>{{rent_amount}} FCFA</strong>, payable d''avance.</p><h2>Article 4 — Dépôt de garantie</h2><p>Le locataire verse au bailleur un dépôt de garantie. Ce dépôt sera restitué en fin de bail, déduction faite des sommes éventuellement dues.</p><h2>Article 5 — Obligations du locataire</h2><p>Le locataire s''engage à : payer le loyer aux termes convenus ; user des lieux conformément à leur destination professionnelle ; ne pas sous-louer sans accord écrit du bailleur ; maintenir les lieux en bon état.</p><h2>Article 6 — Obligations du bailleur</h2><p>Le bailleur s''engage à : délivrer les lieux en bon état ; assurer une jouissance paisible ; effectuer les réparations structurelles.</p><h2>Article 7 — Résiliation</h2><p>Le bail pourra être résilié en cas de non-paiement du loyer, un mois après mise en demeure restée infructueuse.</p><h2>Article 8 — Litiges</h2><p>En cas de litige, les parties s''engagent à rechercher une solution amiable. À défaut, le litige sera soumis aux tribunaux compétents.</p><br/><p><strong>LE BAILLEUR</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>LE LOCATAIRE</strong></p><p>{{agency_name}} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {{tenant_name}}</p><p>Signature : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Signature :</p>');

  RETURN NEW;
END;
$function$;
