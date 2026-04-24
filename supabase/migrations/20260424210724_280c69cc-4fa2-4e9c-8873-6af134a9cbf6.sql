-- Add audit context column to email_reminder_logs to record why a tenant was targeted
ALTER TABLE public.email_reminder_logs
  ADD COLUMN IF NOT EXISTS audit_context JSONB DEFAULT '{}'::jsonb;

-- Allow the system to insert email reminder logs (was previously restricted)
DROP POLICY IF EXISTS "System can insert email_reminder_logs" ON public.email_reminder_logs;
CREATE POLICY "System can insert email_reminder_logs"
  ON public.email_reminder_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- sms_logs.details (jsonb) already exists. Make sure org members can read sms_logs for audit.
DROP POLICY IF EXISTS "Users can view org sms_logs" ON public.sms_logs;
CREATE POLICY "Users can view org sms_logs"
  ON public.sms_logs
  FOR SELECT
  TO authenticated
  USING (
    sms_message_id IN (
      SELECT id FROM public.sms_messages
      WHERE organization_id = public.get_user_org_id(auth.uid())
    )
  );

-- Allow the service role / system to insert sms_logs entries
DROP POLICY IF EXISTS "System can insert sms_logs" ON public.sms_logs;
CREATE POLICY "System can insert sms_logs"
  ON public.sms_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;