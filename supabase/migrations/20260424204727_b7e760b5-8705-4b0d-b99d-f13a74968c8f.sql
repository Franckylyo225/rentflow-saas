-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old daily jobs if any
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT jobname FROM cron.job
    WHERE jobname IN (
      'sms-generate-reminders',
      'sms-generate-reminders-daily',
      'invoke-sms-generate-reminders'
    )
  LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;
END $$;

-- Schedule hourly invocation
SELECT cron.schedule(
  'sms-generate-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dljpgpplvqhhfndpsihz.supabase.co/functions/v1/sms-generate-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsanBncHBsdnFoaGZuZHBzaWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODgyMDYsImV4cCI6MjA5MDk2NDIwNn0.qWsSDdWKw5txeJsT7ARiv2G2obm0kb4Wg0UIyJZfpJw"}'::jsonb,
    body := concat('{"time":"', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- Also keep a queue processor every 5 minutes (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sms-process-queue-5min') THEN
    PERFORM cron.schedule(
      'sms-process-queue-5min',
      '*/5 * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://dljpgpplvqhhfndpsihz.supabase.co/functions/v1/sms-process-queue',
        headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsanBncHBsdnFoaGZuZHBzaWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODgyMDYsImV4cCI6MjA5MDk2NDIwNn0.qWsSDdWKw5txeJsT7ARiv2G2obm0kb4Wg0UIyJZfpJw"}'::jsonb,
        body := '{}'::jsonb
      ) AS request_id;
      $cron$
    );
  END IF;
END $$;