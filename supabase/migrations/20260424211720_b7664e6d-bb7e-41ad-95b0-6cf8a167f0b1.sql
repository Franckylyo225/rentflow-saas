-- Extend platform_email_templates
ALTER TABLE public.platform_email_templates
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'activity',
  ADD COLUMN IF NOT EXISTS is_admin_alert BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_variables TEXT[] NOT NULL DEFAULT '{}';

-- Index for category filter
CREATE INDEX IF NOT EXISTS idx_platform_email_templates_category
  ON public.platform_email_templates(category);

-- Platform email logs (admin SaaS scope)
CREATE TABLE IF NOT EXISTS public.platform_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  organization_id UUID,
  user_id UUID,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_email_logs_created_at
  ON public.platform_email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_email_logs_template_key
  ON public.platform_email_logs(template_key);
CREATE INDEX IF NOT EXISTS idx_platform_email_logs_status
  ON public.platform_email_logs(status);

ALTER TABLE public.platform_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view platform_email_logs" ON public.platform_email_logs;
CREATE POLICY "Super admins can view platform_email_logs"
  ON public.platform_email_logs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admins can delete platform_email_logs" ON public.platform_email_logs;
CREATE POLICY "Super admins can delete platform_email_logs"
  ON public.platform_email_logs
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));