
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  link_url TEXT,
  link_label TEXT,
  bg_color TEXT NOT NULL DEFAULT '#7c3aed',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements are publicly readable"
ON public.announcements FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage announcements"
ON public.announcements FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Seed the first announcement
INSERT INTO public.announcements (message, link_url, link_label, bg_color)
VALUES (
  '🚀 Bêta ouverte ! Utilisez le code promo TRIAL100 pour les 100 premiers inscrits',
  '/auth',
  'S''inscrire maintenant',
  '#7c3aed'
);
