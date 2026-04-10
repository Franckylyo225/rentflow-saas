-- Allow anonymous (unauthenticated) visitors to view visible plans
CREATE POLICY "Public can view visible plans"
  ON public.plans
  FOR SELECT
  TO anon
  USING (is_visible = true AND status IN ('active', 'coming_soon'));

-- Also allow public access to features table for landing pages
CREATE POLICY "Public can view features"
  ON public.features
  FOR SELECT
  TO anon
  USING (true);