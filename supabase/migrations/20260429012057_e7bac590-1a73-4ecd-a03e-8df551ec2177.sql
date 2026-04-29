-- TABLES
CREATE TABLE public.growth_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT NOT NULL DEFAULT 'Email',
  priority TEXT NOT NULL DEFAULT 'Normal',
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_time TIME,
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  ai_content TEXT,
  recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.growth_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  users_count INTEGER NOT NULL DEFAULT 0,
  new_users INTEGER NOT NULL DEFAULT 0,
  tasks_done INTEGER NOT NULL DEFAULT 0,
  tasks_total INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.growth_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_growth_tasks_due_date ON public.growth_tasks(due_date);
CREATE INDEX idx_growth_tasks_done ON public.growth_tasks(done);
CREATE INDEX idx_growth_metrics_date ON public.growth_metrics(date DESC);

ALTER TABLE public.growth_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage growth_tasks" ON public.growth_tasks
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage growth_metrics" ON public.growth_metrics
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage growth_settings" ON public.growth_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_growth_tasks_updated
  BEFORE UPDATE ON public.growth_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DONNÉES INITIALES
INSERT INTO public.growth_settings (key, value) VALUES
  ('start_date', '2026-04-29'),
  ('target_users', '1000'),
  ('target_months', '24');

INSERT INTO public.growth_metrics (date, users_count, new_users) VALUES
  ('2026-02-28', 53, 8),
  ('2026-03-31', 65, 12),
  ('2026-04-29', 77, 12);

INSERT INTO public.growth_tasks (title, description, type, priority, due_date, due_time) VALUES
  ('Envoyer email 1 aux 50 agences', 'Premier contact email avec les 50 agences ciblées', 'Email', 'Urgent', '2026-04-29', '09:00'),
  ('Publier post LinkedIn S1', 'Post LinkedIn de la semaine 1', 'Réseaux', 'Normal', '2026-04-29', '11:00'),
  ('Corriger SEO rent-flow.net', 'Optimisation SEO du site', 'Tech', 'Normal', '2026-04-29', '14:00'),
  ('Pitcher Afrikmag par email', 'Email de pitch à Afrikmag', 'PR', 'Normal', '2026-04-29', '16:00'),
  ('Email J+3 relances', 'Relancer les agences contactées il y a 3 jours', 'Email', 'Normal', '2026-04-30', '09:00'),
  ('Post Facebook vidéo démo', 'Publier vidéo de démo sur Facebook', 'Réseaux', 'Normal', '2026-05-01', '10:00'),
  ('Email J+7 offre limitée', 'Email avec offre limitée dans le temps', 'Email', 'Urgent', '2026-05-05', '09:00'),
  ('Article Afrikmag si réponse', 'Suivre publication article Afrikmag', 'PR', 'Normal', '2026-05-06', '11:00'),
  ('Post Instagram dashboard', 'Capture du dashboard sur Instagram', 'Réseaux', 'Normal', '2026-05-07', '15:00'),
  ('Nouvelle vague 50 agences Marcory', 'Cibler 50 nouvelles agences à Marcory', 'Email', 'Normal', '2026-05-12', '09:00'),
  ('Bilan M+1 + ajustement stratégie', 'Bilan du premier mois et ajustements', 'Produit', 'Normal', '2026-05-15', '14:00');

-- CRON HEBDOMADAIRE
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'generate-weekly-growth-tasks',
  '0 7 * * 1',
  $$
  SELECT net.http_post(
    url:='https://dljpgpplvqhhfndpsihz.supabase.co/functions/v1/generate-weekly-tasks',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsanBncHBsdnFoaGZuZHBzaWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODgyMDYsImV4cCI6MjA5MDk2NDIwNn0.qWsSDdWKw5txeJsT7ARiv2G2obm0kb4Wg0UIyJZfpJw"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);