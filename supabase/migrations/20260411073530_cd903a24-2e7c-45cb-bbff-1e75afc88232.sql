
-- Add expires_at to contracts
ALTER TABLE public.contracts ADD COLUMN expires_at DATE;

-- Create contract_reminders to track sent reminders and avoid duplicates
CREATE TABLE public.contract_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contract_id, reminder_type)
);

ALTER TABLE public.contract_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org contract_reminders"
ON public.contract_reminders
FOR SELECT
TO authenticated
USING (
  contract_id IN (
    SELECT c.id FROM contracts c
    JOIN tenants t ON c.tenant_id = t.id
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
);

CREATE POLICY "System can insert contract_reminders"
ON public.contract_reminders
FOR INSERT
TO authenticated
WITH CHECK (true);
