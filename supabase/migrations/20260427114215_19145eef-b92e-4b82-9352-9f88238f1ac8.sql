ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS yearly_discount_percent integer NOT NULL DEFAULT 0
CHECK (yearly_discount_percent >= 0 AND yearly_discount_percent <= 100);

ALTER TABLE public.payment_transactions
ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly'
CHECK (billing_cycle IN ('monthly', 'yearly'));

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly'
CHECK (billing_cycle IN ('monthly', 'yearly'));