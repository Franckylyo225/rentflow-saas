-- =========================
-- TABLE: support_tickets
-- =========================
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'question' CHECK (category IN ('bug','question','billing','feature','other')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting_user','resolved','closed')),
  assigned_to UUID,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_tickets_org ON public.support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX idx_support_tickets_last_msg ON public.support_tickets(last_message_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Org users: voir tickets de leur org
CREATE POLICY "Org users view org tickets"
ON public.support_tickets FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

-- Org users: créer un ticket dans leur org
CREATE POLICY "Org users create tickets"
ON public.support_tickets FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_org_id(auth.uid())
  AND created_by = auth.uid()
);

-- Org users: mettre à jour leurs propres tickets (ex: fermer)
CREATE POLICY "Org creators update own tickets"
ON public.support_tickets FOR UPDATE
TO authenticated
USING (created_by = auth.uid() AND organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (created_by = auth.uid() AND organization_id = public.get_user_org_id(auth.uid()));

-- Super admins: tout
CREATE POLICY "Super admins manage all tickets"
ON public.support_tickets FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- TABLE: support_ticket_messages
-- =========================
CREATE TABLE public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('agency','admin')),
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Org users: voir messages non-internes de leurs tickets
CREATE POLICY "Org users view ticket messages"
ON public.support_ticket_messages FOR SELECT
TO authenticated
USING (
  is_internal = false
  AND ticket_id IN (
    SELECT id FROM public.support_tickets
    WHERE organization_id = public.get_user_org_id(auth.uid())
  )
);

-- Org users: poster un message sur leurs tickets (jamais interne)
CREATE POLICY "Org users post messages"
ON public.support_ticket_messages FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND author_role = 'agency'
  AND is_internal = false
  AND ticket_id IN (
    SELECT id FROM public.support_tickets
    WHERE organization_id = public.get_user_org_id(auth.uid())
  )
);

-- Super admins: tout
CREATE POLICY "Super admins manage messages"
ON public.support_ticket_messages FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- =========================
-- TABLE: support_ticket_attachments
-- =========================
CREATE TABLE public.support_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_attachments_ticket ON public.support_ticket_attachments(ticket_id);

ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users view ticket attachments"
ON public.support_ticket_attachments FOR SELECT
TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets
    WHERE organization_id = public.get_user_org_id(auth.uid())
  )
);

CREATE POLICY "Org users add attachments"
ON public.support_ticket_attachments FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND ticket_id IN (
    SELECT id FROM public.support_tickets
    WHERE organization_id = public.get_user_org_id(auth.uid())
  )
);

CREATE POLICY "Super admins manage attachments"
ON public.support_ticket_attachments FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- =========================
-- Trigger: bump last_message_at + notifs
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_ticket_message()
RETURNS TRIGGER
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

  -- Bump last_message_at
  UPDATE public.support_tickets
  SET last_message_at = NEW.created_at,
      status = CASE
        WHEN NEW.author_role = 'agency' AND status IN ('waiting_user','resolved') THEN 'open'
        WHEN NEW.author_role = 'admin' AND status = 'open' THEN 'in_progress'
        ELSE status
      END
  WHERE id = NEW.ticket_id;

  -- Notif côté agence quand admin répond (et pas interne)
  IF NEW.author_role = 'admin' AND NEW.is_internal = false AND t_creator IS NOT NULL THEN
    INSERT INTO public.notifications (organization_id, user_id, type, title, description, reference_id, reference_type)
    VALUES (t_org_id, t_creator, 'info', 'Nouvelle réponse du support',
            'Ticket : ' || COALESCE(t_subject, ''), NEW.ticket_id, 'support_ticket');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_ticket_message
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_ticket_message();

-- =========================
-- Storage bucket
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org users gèrent leurs fichiers (path = orgId/...)
CREATE POLICY "Org users read own ticket files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "Org users upload ticket files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "Super admins manage ticket files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'support-attachments' AND public.is_super_admin(auth.uid()))
WITH CHECK (bucket_id = 'support-attachments' AND public.is_super_admin(auth.uid()));