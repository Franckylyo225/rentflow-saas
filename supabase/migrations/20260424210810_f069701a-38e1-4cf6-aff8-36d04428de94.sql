DROP POLICY IF EXISTS "System can insert email_reminder_logs" ON public.email_reminder_logs;
CREATE POLICY "Org members can insert email_reminder_logs"
  ON public.email_reminder_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));

DROP POLICY IF EXISTS "System can insert sms_logs" ON public.sms_logs;
CREATE POLICY "Org members can insert sms_logs"
  ON public.sms_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sms_message_id IN (
      SELECT id FROM public.sms_messages
      WHERE organization_id = public.get_user_org_id(auth.uid())
    )
  );