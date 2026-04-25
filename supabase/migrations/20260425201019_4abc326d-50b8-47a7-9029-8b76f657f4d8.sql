-- Table property_listings
CREATE TABLE public.property_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  asking_price BIGINT NOT NULL DEFAULT 0,
  listed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_listings_org ON public.property_listings(organization_id);

ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org property_listings"
ON public.property_listings FOR SELECT
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Super admins can view all property_listings"
ON public.property_listings FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admin/gestionnaire can insert property_listings"
ON public.property_listings FOR INSERT
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin/gestionnaire can update property_listings"
ON public.property_listings FOR UPDATE
USING (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin can delete property_listings"
ON public.property_listings FOR DELETE
USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

CREATE TRIGGER trg_property_listings_updated
BEFORE UPDATE ON public.property_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table property_sales
CREATE TABLE public.property_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  sale_price BIGINT NOT NULL DEFAULT 0,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  buyer_name TEXT NOT NULL DEFAULT '',
  commission BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_property_sales_org ON public.property_sales(organization_id);
CREATE INDEX idx_property_sales_date ON public.property_sales(sale_date);

ALTER TABLE public.property_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org property_sales"
ON public.property_sales FOR SELECT
USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Super admins can view all property_sales"
ON public.property_sales FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admin/gestionnaire can insert property_sales"
ON public.property_sales FOR INSERT
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin/gestionnaire can update property_sales"
ON public.property_sales FOR UPDATE
USING (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin can delete property_sales"
ON public.property_sales FOR DELETE
USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

CREATE TRIGGER trg_property_sales_updated
BEFORE UPDATE ON public.property_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();