CREATE POLICY "Super admins can view all properties"
ON public.properties FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all units"
ON public.units FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all tenants"
ON public.tenants FOR SELECT TO authenticated
USING (is_super_admin(auth.uid()));