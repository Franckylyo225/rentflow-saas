-- Recipient-level tracking
ALTER TABLE public.campaign_recipients
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz,
  ADD COLUMN IF NOT EXISTS bounce_type text,
  ADD COLUMN IF NOT EXISTS complained_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

-- Contact-level deliverability summary
ALTER TABLE public.marketing_contacts
  ADD COLUMN IF NOT EXISTS bounce_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_bounce_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_bounce_type text,
  ADD COLUMN IF NOT EXISTS complained_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS deliverability text NOT NULL DEFAULT 'good';

-- Raw webhook event log
CREATE TABLE IF NOT EXISTS public.email_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'resend',
  event_type text NOT NULL,
  email text,
  recipient_id uuid REFERENCES public.campaign_recipients(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.marketing_contacts(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_webhook_events_email ON public.email_webhook_events(email);
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_type ON public.email_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_created ON public.email_webhook_events(created_at DESC);

ALTER TABLE public.email_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read webhook events"
ON public.email_webhook_events FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));