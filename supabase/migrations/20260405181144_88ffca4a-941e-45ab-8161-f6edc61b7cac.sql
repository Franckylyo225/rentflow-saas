
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price_monthly bigint NOT NULL DEFAULT 0,
  max_properties integer DEFAULT NULL,
  max_users integer DEFAULT NULL,
  feature_flags text[] NOT NULL DEFAULT '{}',
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read visible plans
CREATE POLICY "Anyone can view visible plans" ON public.plans
  FOR SELECT TO authenticated
  USING (is_visible = true);

-- Super admins full access
CREATE POLICY "Super admins full access on plans" ON public.plans
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Seed default plans
INSERT INTO public.plans (slug, name, description, price_monthly, max_properties, max_users, feature_flags, is_visible, sort_order)
VALUES
  ('starter', 'Starter', 'Idéal pour les petits portefeuilles', 15000, 5, 3, ARRAY['properties','tenants','rents','expenses'], true, 1),
  ('pro', 'Pro', 'Pour les gestionnaires en croissance', 35000, 20, 10, ARRAY['properties','tenants','rents','expenses','reports','patrimoine','employees'], true, 2),
  ('enterprise', 'Enterprise', 'Gestion illimitée et support prioritaire', 75000, NULL, NULL, ARRAY['properties','tenants','rents','expenses','reports','patrimoine','employees','api_access','priority_support'], true, 3);
