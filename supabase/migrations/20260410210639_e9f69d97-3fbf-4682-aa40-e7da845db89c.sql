-- Create subscription history table
CREATE TABLE public.subscription_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'plan_change',
  previous_plan TEXT,
  new_plan TEXT,
  amount BIGINT DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Org members can view their own history
CREATE POLICY "Org members can view own subscription_history"
ON public.subscription_history
FOR SELECT
TO authenticated
USING (organization_id = get_user_org_id(auth.uid()));

-- Org admins can insert history entries
CREATE POLICY "Org admin can insert subscription_history"
ON public.subscription_history
FOR INSERT
TO authenticated
WITH CHECK (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

-- Super admins full access
CREATE POLICY "Super admins full access on subscription_history"
ON public.subscription_history
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Auto-log plan changes via trigger
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan THEN
    INSERT INTO public.subscription_history (organization_id, event_type, previous_plan, new_plan, notes)
    VALUES (NEW.organization_id, 'plan_change', OLD.plan, NEW.plan, 'Changement automatique');
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.subscription_history (organization_id, event_type, previous_plan, new_plan, notes)
    VALUES (NEW.organization_id, 'status_change', OLD.status, NEW.status, 'Changement de statut');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_change
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subscription_change();

-- Also log initial trial creation
CREATE OR REPLACE FUNCTION public.log_subscription_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscription_history (organization_id, event_type, new_plan, notes)
  VALUES (NEW.organization_id, 'trial_start', NEW.plan, 'Début de l''essai gratuit');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_created
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subscription_creation();