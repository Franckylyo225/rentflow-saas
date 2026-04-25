-- 1. Fix user_roles: prevent cross-org role management
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admin can manage org user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  is_org_admin(auth.uid())
  AND user_id IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
)
WITH CHECK (
  is_org_admin(auth.uid())
  AND user_id IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
);

CREATE POLICY "Super admins can manage all user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 2. Fix contract_reminders: restrict inserts to org members
DROP POLICY IF EXISTS "System can insert contract_reminders" ON public.contract_reminders;

CREATE POLICY "Org members can insert contract_reminders"
ON public.contract_reminders
FOR INSERT
TO authenticated
WITH CHECK (
  contract_id IN (
    SELECT c.id
    FROM public.contracts c
    JOIN public.tenants t ON c.tenant_id = t.id
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
);

-- 3. Add super_admin SELECT policies for sensitive tables that lacked them
CREATE POLICY "Super admins can view all rent_payments"
ON public.rent_payments
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all payment_records"
ON public.payment_records
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all lease_documents"
ON public.lease_documents
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all escalation_tasks"
ON public.escalation_tasks
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all bail_terminations"
ON public.bail_terminations
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all contracts"
ON public.contracts
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all employees"
ON public.employees
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can view all patrimony_assets"
ON public.patrimony_assets
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));