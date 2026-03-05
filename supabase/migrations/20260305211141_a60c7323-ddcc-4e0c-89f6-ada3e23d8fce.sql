
-- Table des titulaires (holders)
CREATE TABLE public.asset_holders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des actifs patrimoniaux
CREATE TABLE public.patrimony_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'terrain',
  holder_id UUID REFERENCES public.asset_holders(id) ON DELETE SET NULL,
  locality TEXT NOT NULL DEFAULT '',
  subdivision_name TEXT NOT NULL DEFAULT '',
  land_title TEXT NOT NULL DEFAULT '',
  handling_firm TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Personnes ressources par actif
CREATE TABLE public.patrimony_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.patrimony_assets(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documents par actif
CREATE TABLE public.patrimony_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.patrimony_assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'autre',
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.asset_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrimony_documents ENABLE ROW LEVEL SECURITY;

-- asset_holders policies
CREATE POLICY "Users can view org asset_holders" ON public.asset_holders FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can insert asset_holders" ON public.asset_holders FOR INSERT WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can update asset_holders" ON public.asset_holders FOR UPDATE USING (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin can delete asset_holders" ON public.asset_holders FOR DELETE USING (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

-- patrimony_assets policies
CREATE POLICY "Users can view org patrimony_assets" ON public.patrimony_assets FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can insert patrimony_assets" ON public.patrimony_assets FOR INSERT WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can update patrimony_assets" ON public.patrimony_assets FOR UPDATE USING (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin can delete patrimony_assets" ON public.patrimony_assets FOR DELETE USING (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

-- patrimony_contacts policies (via asset org)
CREATE POLICY "Users can view org patrimony_contacts" ON public.patrimony_contacts FOR SELECT USING (asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Admin/gestionnaire can insert patrimony_contacts" ON public.patrimony_contacts FOR INSERT WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Admin/gestionnaire can update patrimony_contacts" ON public.patrimony_contacts FOR UPDATE USING (is_gestionnaire_or_admin(auth.uid()) AND asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Admin can delete patrimony_contacts" ON public.patrimony_contacts FOR DELETE USING (is_org_admin(auth.uid()) AND asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = get_user_org_id(auth.uid())));

-- patrimony_documents policies (via asset org)
CREATE POLICY "Users can view org patrimony_documents" ON public.patrimony_documents FOR SELECT USING (asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Admin/gestionnaire can insert patrimony_documents" ON public.patrimony_documents FOR INSERT WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = get_user_org_id(auth.uid())));
CREATE POLICY "Admin can delete patrimony_documents" ON public.patrimony_documents FOR DELETE USING (is_org_admin(auth.uid()) AND asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = get_user_org_id(auth.uid())));

-- Storage bucket for patrimony documents
INSERT INTO storage.buckets (id, name, public) VALUES ('patrimony-docs', 'patrimony-docs', false);

-- Storage RLS for patrimony-docs bucket
CREATE POLICY "Authenticated users can upload patrimony docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'patrimony-docs');
CREATE POLICY "Authenticated users can view patrimony docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'patrimony-docs');
CREATE POLICY "Authenticated users can delete patrimony docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'patrimony-docs');

-- Triggers for updated_at
CREATE TRIGGER update_asset_holders_updated_at BEFORE UPDATE ON public.asset_holders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patrimony_assets_updated_at BEFORE UPDATE ON public.patrimony_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
