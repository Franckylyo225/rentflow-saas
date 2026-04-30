-- Add SLA + assignment + linked rent payment fields
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS linked_rent_payment_id uuid,
  ADD COLUMN IF NOT EXISTS sla_due_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS first_response_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla ON public.support_tickets(sla_due_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_linked_rent ON public.support_tickets(linked_rent_payment_id);

-- Function: compute SLA target based on priority (hours from creation)
CREATE OR REPLACE FUNCTION public.compute_ticket_sla(p_priority text, p_created timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_created + (
    CASE p_priority
      WHEN 'urgent' THEN interval '4 hours'
      WHEN 'high' THEN interval '24 hours'
      WHEN 'normal' THEN interval '48 hours'
      WHEN 'low' THEN interval '72 hours'
      ELSE interval '48 hours'
    END
  );
$$;

-- Trigger: set sla_due_at on insert and on priority change
CREATE OR REPLACE FUNCTION public.set_ticket_sla()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.sla_due_at := compute_ticket_sla(NEW.priority, NEW.created_at);
  ELSIF TG_OP = 'UPDATE' AND NEW.priority IS DISTINCT FROM OLD.priority THEN
    NEW.sla_due_at := compute_ticket_sla(NEW.priority, NEW.created_at);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ticket_sla ON public.support_tickets;
CREATE TRIGGER trg_set_ticket_sla
BEFORE INSERT OR UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_ticket_sla();

-- Backfill existing tickets
UPDATE public.support_tickets
SET sla_due_at = compute_ticket_sla(priority, created_at)
WHERE sla_due_at IS NULL;

-- Trigger: capture first_response_at when admin posts non-internal message
CREATE OR REPLACE FUNCTION public.capture_first_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.author_role = 'admin' AND COALESCE(NEW.is_internal, false) = false THEN
    UPDATE public.support_tickets
    SET first_response_at = NEW.created_at
    WHERE id = NEW.ticket_id AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_first_response ON public.support_ticket_messages;
CREATE TRIGGER trg_capture_first_response
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.capture_first_response();

-- Allow super admins to update tickets (assignment, status, link, etc.)
DROP POLICY IF EXISTS "Super admins can update tickets" ON public.support_tickets;
CREATE POLICY "Super admins can update tickets"
ON public.support_tickets
FOR UPDATE
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can view tickets" ON public.support_tickets;
CREATE POLICY "Super admins can view tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));