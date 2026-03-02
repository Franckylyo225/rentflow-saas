
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_org ON public.notifications(organization_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- System/admin can insert notifications for org members
CREATE POLICY "Org members can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (organization_id = get_user_org_id(auth.uid()));

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- Trigger to auto-generate notifications on rent_payment status changes
CREATE OR REPLACE FUNCTION public.notify_on_payment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tenant_name TEXT;
  org_id UUID;
  admin_user RECORD;
  notif_title TEXT;
  notif_type TEXT;
  notif_desc TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get tenant info
  SELECT t.full_name, p.organization_id INTO tenant_name, org_id
  FROM tenants t
  JOIN units u ON t.unit_id = u.id
  JOIN properties p ON u.property_id = p.id
  WHERE t.id = NEW.tenant_id;

  IF org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine notification content
  IF NEW.status = 'late' THEN
    notif_type := 'late';
    notif_title := 'Loyer en retard';
    notif_desc := tenant_name || ' — ' || (NEW.amount - NEW.paid_amount)::TEXT || ' FCFA impayés';
  ELSIF NEW.status = 'partial' THEN
    notif_type := 'partial';
    notif_title := 'Paiement partiel reçu';
    notif_desc := tenant_name || ' — ' || NEW.paid_amount::TEXT || ' / ' || NEW.amount::TEXT || ' FCFA';
  ELSIF NEW.status = 'paid' THEN
    notif_type := 'paid';
    notif_title := 'Loyer encaissé';
    notif_desc := tenant_name || ' — ' || NEW.paid_amount::TEXT || ' FCFA';
  ELSE
    RETURN NEW;
  END IF;

  -- Insert notification for all admin/gestionnaire users in the org
  FOR admin_user IN
    SELECT pr.user_id FROM profiles pr
    JOIN user_roles ur ON pr.user_id = ur.user_id
    WHERE pr.organization_id = org_id
    AND (ur.role = 'admin' OR ur.role = 'gestionnaire')
  LOOP
    INSERT INTO public.notifications (organization_id, user_id, type, title, description, reference_id, reference_type)
    VALUES (org_id, admin_user.user_id, notif_type, notif_title, notif_desc, NEW.id, 'rent_payment');
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_payment_change
AFTER UPDATE ON public.rent_payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_payment_change();
