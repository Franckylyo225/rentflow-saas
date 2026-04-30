-- 1. Table de préférences de notifications
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  ticket_status_change BOOLEAN NOT NULL DEFAULT true,
  ticket_new_reply BOOLEAN NOT NULL DEFAULT true,
  ticket_internal_note BOOLEAN NOT NULL DEFAULT true,
  rent_late BOOLEAN NOT NULL DEFAULT true,
  rent_partial BOOLEAN NOT NULL DEFAULT true,
  rent_paid BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own preferences" ON public.notification_preferences
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own preferences" ON public.notification_preferences
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own preferences" ON public.notification_preferences
FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Helper: récupérer la préférence (true par défaut si non défini)
CREATE OR REPLACE FUNCTION public.get_notification_pref(_user_id UUID, _pref TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  EXECUTE format('SELECT %I FROM public.notification_preferences WHERE user_id = $1', _pref)
    INTO result USING _user_id;
  RETURN COALESCE(result, true);
END;
$$;

-- 3. Mise à jour du trigger handle_new_ticket_message pour respecter les préférences
CREATE OR REPLACE FUNCTION public.handle_new_ticket_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_org_id UUID;
  t_subject TEXT;
  t_creator UUID;
  admin_rec RECORD;
BEGIN
  SELECT organization_id, subject, created_by
  INTO t_org_id, t_subject, t_creator
  FROM public.support_tickets WHERE id = NEW.ticket_id;

  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      status = CASE
        WHEN NEW.author_role = 'agency' AND status IN ('waiting_user','resolved') THEN 'open'
        WHEN NEW.author_role = 'admin' AND status = 'open' THEN 'in_progress'
        ELSE status
      END
  WHERE id = NEW.ticket_id;

  -- Notification côté agence quand admin répond (réponse publique uniquement)
  IF NEW.author_role = 'admin' AND NEW.is_internal = false AND t_creator IS NOT NULL THEN
    IF public.get_notification_pref(t_creator, 'ticket_new_reply') THEN
      INSERT INTO public.notifications (organization_id, user_id, type, title, description, reference_id, reference_type)
      VALUES (t_org_id, t_creator, 'ticket_reply', 'Nouvelle réponse du support',
              'Ticket : ' || COALESCE(t_subject, ''), NEW.ticket_id, 'support_ticket');
    END IF;
  END IF;

  -- Notification côté admins SaaS quand l'agence répond
  IF NEW.author_role = 'agency' THEN
    FOR admin_rec IN SELECT user_id FROM public.super_admins LOOP
      IF public.get_notification_pref(admin_rec.user_id, 'ticket_new_reply') THEN
        INSERT INTO public.notifications (organization_id, user_id, type, title, description, reference_id, reference_type)
        VALUES (t_org_id, admin_rec.user_id, 'ticket_reply', 'Nouvelle réponse agence',
                'Ticket : ' || COALESCE(t_subject, ''), NEW.ticket_id, 'support_ticket');
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Nouveau trigger : notification sur changement de statut de ticket
CREATE OR REPLACE FUNCTION public.handle_ticket_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_label TEXT;
  admin_rec RECORD;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  status_label := CASE NEW.status
    WHEN 'open' THEN 'Ouvert'
    WHEN 'in_progress' THEN 'En cours'
    WHEN 'waiting_user' THEN 'En attente de votre réponse'
    WHEN 'resolved' THEN 'Résolu'
    WHEN 'closed' THEN 'Fermé'
    ELSE NEW.status
  END;

  -- Notifier le créateur du ticket (côté agence)
  IF NEW.created_by IS NOT NULL THEN
    IF public.get_notification_pref(NEW.created_by, 'ticket_status_change') THEN
      INSERT INTO public.notifications (organization_id, user_id, type, title, description, reference_id, reference_type)
      VALUES (NEW.organization_id, NEW.created_by, 'ticket_status', 'Statut du ticket mis à jour',
              COALESCE(NEW.subject, 'Ticket') || ' → ' || status_label,
              NEW.id, 'support_ticket');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ticket_status_change
AFTER UPDATE OF status ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_status_change();

-- 5. Trigger sur insert de message (s'il n'existe pas déjà)
DROP TRIGGER IF EXISTS trg_new_ticket_message ON public.support_ticket_messages;
CREATE TRIGGER trg_new_ticket_message
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_ticket_message();