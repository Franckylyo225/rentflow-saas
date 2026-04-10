
-- Table lease_documents
CREATE TABLE public.lease_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'uploaded', -- 'uploaded' or 'generated'
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org lease_documents" ON public.lease_documents
FOR SELECT USING (
  tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
);

CREATE POLICY "Admin/gestionnaire can insert lease_documents" ON public.lease_documents
FOR INSERT WITH CHECK (
  is_gestionnaire_or_admin(auth.uid()) AND tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
);

CREATE POLICY "Admin can delete lease_documents" ON public.lease_documents
FOR DELETE USING (
  is_org_admin(auth.uid()) AND tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
);

CREATE TRIGGER update_lease_documents_updated_at
  BEFORE UPDATE ON public.lease_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('lease-documents', 'lease-documents', false);

-- Storage policies
CREATE POLICY "Org members can view lease docs" ON storage.objects
FOR SELECT USING (bucket_id = 'lease-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Admin/gestionnaire can upload lease docs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'lease-documents' AND is_gestionnaire_or_admin(auth.uid()));

CREATE POLICY "Admin can delete lease docs" ON storage.objects
FOR DELETE USING (bucket_id = 'lease-documents' AND is_org_admin(auth.uid()));
