
ALTER TABLE public.property_listings
  ADD COLUMN IF NOT EXISTS property_type text NOT NULL DEFAULT 'villa',
  ADD COLUMN IF NOT EXISTS visits_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'en_vente';

ALTER TABLE public.property_sales
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'finalise';
