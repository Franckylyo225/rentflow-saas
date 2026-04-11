
-- Table: contract_templates
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  template_type TEXT NOT NULL DEFAULT 'individual',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org contract_templates"
  ON public.contract_templates FOR SELECT
  TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin can manage contract_templates"
  ON public.contract_templates FOR ALL
  TO authenticated
  USING (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()))
  WITH CHECK (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: contracts
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  ));

CREATE POLICY "Admin/gestionnaire can insert contracts"
  ON public.contracts FOR INSERT
  TO authenticated
  WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  ));

CREATE POLICY "Admin/gestionnaire can update contracts"
  ON public.contracts FOR UPDATE
  TO authenticated
  USING (is_gestionnaire_or_admin(auth.uid()) AND tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  ));

CREATE POLICY "Admin can delete contracts"
  ON public.contracts FOR DELETE
  TO authenticated
  USING (is_org_admin(auth.uid()) AND tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  ));

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
