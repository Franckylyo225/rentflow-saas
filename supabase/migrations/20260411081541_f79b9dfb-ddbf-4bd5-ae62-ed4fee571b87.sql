
CREATE TABLE public.email_reminder_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rent_payment_id UUID NOT NULL REFERENCES public.rent_payments(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT uq_reminder_per_payment UNIQUE (rent_payment_id, template_key)
);

ALTER TABLE public.email_reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view reminder logs"
ON public.email_reminder_logs
FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));
