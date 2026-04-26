
CREATE TABLE public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  provider TEXT NOT NULL DEFAULT 'geniuspay',
  reference TEXT NOT NULL UNIQUE,
  provider_transaction_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'pending',
  environment TEXT NOT NULL DEFAULT 'sandbox',
  purpose TEXT NOT NULL DEFAULT 'subscription',
  plan_slug TEXT,
  checkout_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  webhook_payload JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_org ON public.payment_transactions(organization_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX idx_payment_transactions_reference ON public.payment_transactions(reference);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org transactions"
ON public.payment_transactions FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admins can view their org transactions"
ON public.payment_transactions FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()) AND public.is_org_admin(auth.uid()))
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()) AND public.is_org_admin(auth.uid()));

CREATE POLICY "Super admins can view all"
ON public.payment_transactions FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
