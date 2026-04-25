-- Marketing contacts
CREATE TABLE public.marketing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','interested','converted','unsubscribed')),
  score INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  subscribed BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_contacts_status ON public.marketing_contacts(status);
CREATE INDEX idx_marketing_contacts_source ON public.marketing_contacts(source);
CREATE INDEX idx_marketing_contacts_email ON public.marketing_contacts(email);

ALTER TABLE public.marketing_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage marketing_contacts"
ON public.marketing_contacts FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Allow public lead capture (for newsletter form)
CREATE POLICY "Public can subscribe"
ON public.marketing_contacts FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE TRIGGER update_marketing_contacts_updated_at
BEFORE UPDATE ON public.marketing_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaigns
CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
  segment_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_opened INTEGER NOT NULL DEFAULT 0,
  total_clicked INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage campaigns"
ON public.marketing_campaigns FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER update_marketing_campaigns_updated_at
BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recipients
CREATE TABLE public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.marketing_contacts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','bounced')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  first_opened_at TIMESTAMPTZ,
  open_count INTEGER NOT NULL DEFAULT 0,
  first_clicked_at TIMESTAMPTZ,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, contact_id)
);

CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_contact ON public.campaign_recipients(contact_id);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage recipients"
ON public.campaign_recipients FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Events
CREATE TABLE public.campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.campaign_recipients(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('open','click')),
  url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_events_campaign ON public.campaign_events(campaign_id);
CREATE INDEX idx_campaign_events_recipient ON public.campaign_events(recipient_id);

ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read events"
ON public.campaign_events FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Auto-sync new SaaS signups as converted contacts
CREATE OR REPLACE FUNCTION public.sync_profile_to_marketing_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_name TEXT;
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO org_name FROM public.organizations WHERE id = NEW.organization_id;

  INSERT INTO public.marketing_contacts (email, full_name, phone, company, source, status, organization_id, last_activity_at)
  VALUES (
    LOWER(NEW.email),
    NEW.full_name,
    NEW.phone,
    COALESCE(org_name, ''),
    'signup',
    'converted',
    NEW.organization_id,
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    status = 'converted',
    organization_id = EXCLUDED.organization_id,
    company = COALESCE(EXCLUDED.company, marketing_contacts.company),
    full_name = COALESCE(EXCLUDED.full_name, marketing_contacts.full_name),
    phone = COALESCE(EXCLUDED.phone, marketing_contacts.phone),
    last_activity_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_marketing_contact
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_marketing_contact();