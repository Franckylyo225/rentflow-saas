
-- Workflows (séquences)
CREATE TABLE public.marketing_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'on_signup' | 'on_lead_capture'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Étapes du workflow
CREATE TABLE public.marketing_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.marketing_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  delay_days INTEGER NOT NULL DEFAULT 0, -- J0 = 0, J+2 = 2, J+4 = 4
  subject TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  condition_type TEXT NOT NULL DEFAULT 'always', -- 'always' | 'opened_previous' | 'not_opened_previous'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_steps_workflow ON public.marketing_workflow_steps(workflow_id, step_order);

-- Inscriptions contacts
CREATE TABLE public.marketing_workflow_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.marketing_workflows(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.marketing_contacts(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'cancelled'
  current_step_order INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE (workflow_id, contact_id)
);

CREATE INDEX idx_enrollments_status ON public.marketing_workflow_enrollments(status, workflow_id);

-- Trace d'exécution
CREATE TABLE public.marketing_workflow_step_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.marketing_workflow_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.marketing_workflow_steps(id) ON DELETE CASCADE,
  recipient_id UUID, -- lien vers campaign_recipients pour tracking opens/clicks
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'skipped' | 'failed'
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_step_runs_pending ON public.marketing_workflow_step_runs(status, scheduled_for);

-- RLS
ALTER TABLE public.marketing_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_workflow_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_workflow_step_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage workflows" ON public.marketing_workflows
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage workflow_steps" ON public.marketing_workflow_steps
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage enrollments" ON public.marketing_workflow_enrollments
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage step_runs" ON public.marketing_workflow_step_runs
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Triggers updated_at
CREATE TRIGGER update_marketing_workflows_updated_at
  BEFORE UPDATE ON public.marketing_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marketing_workflow_steps_updated_at
  BEFORE UPDATE ON public.marketing_workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
