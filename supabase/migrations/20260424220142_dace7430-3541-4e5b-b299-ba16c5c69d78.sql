CREATE POLICY "Super admins can view all sms_messages"
ON public.sms_messages FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all email_reminder_logs"
ON public.email_reminder_logs FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));