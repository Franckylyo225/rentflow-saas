
-- 1. Promo codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_code_unique UNIQUE (code)
);

-- 2. Promo code usage tracking
CREATE TABLE public.promo_code_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_slug text NOT NULL,
  discount_applied numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usages ENABLE ROW LEVEL SECURITY;

-- 4. RLS for promo_codes
CREATE POLICY "Super admins full access on promo_codes"
ON public.promo_codes FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated can view active promo_codes"
ON public.promo_codes FOR SELECT TO authenticated
USING (is_active = true);

-- 5. RLS for promo_code_usages
CREATE POLICY "Super admins full access on promo_code_usages"
ON public.promo_code_usages FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Org admin can insert own usage"
ON public.promo_code_usages FOR INSERT TO authenticated
WITH CHECK (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Org members can view own usages"
ON public.promo_code_usages FOR SELECT TO authenticated
USING (organization_id = get_user_org_id(auth.uid()));

-- 6. Updated_at trigger
CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Function to validate and apply a promo code atomically
CREATE OR REPLACE FUNCTION public.apply_promo_code(
  _code text,
  _organization_id uuid,
  _plan_slug text,
  _plan_price numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  promo record;
  discount numeric;
  already_used boolean;
BEGIN
  -- Find the code
  SELECT * INTO promo FROM public.promo_codes
  WHERE upper(code) = upper(_code) AND is_active = true;

  IF promo IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code promo invalide');
  END IF;

  -- Check expiry
  IF promo.expires_at IS NOT NULL AND promo.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce code promo a expiré');
  END IF;

  -- Check max uses
  IF promo.max_uses IS NOT NULL AND promo.current_uses >= promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce code promo a atteint sa limite d''utilisation');
  END IF;

  -- Check if org already used this code
  SELECT EXISTS (
    SELECT 1 FROM public.promo_code_usages
    WHERE promo_code_id = promo.id AND organization_id = _organization_id
  ) INTO already_used;

  IF already_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà utilisé ce code promo');
  END IF;

  -- Calculate discount
  IF promo.discount_type = 'percentage' THEN
    discount := _plan_price * promo.discount_value / 100;
  ELSE
    discount := LEAST(promo.discount_value, _plan_price);
  END IF;

  -- Record usage
  INSERT INTO public.promo_code_usages (promo_code_id, organization_id, plan_slug, discount_applied)
  VALUES (promo.id, _organization_id, _plan_slug, discount);

  -- Increment counter
  UPDATE public.promo_codes SET current_uses = current_uses + 1 WHERE id = promo.id;

  RETURN jsonb_build_object(
    'success', true,
    'discount', discount,
    'discount_type', promo.discount_type,
    'discount_value', promo.discount_value,
    'final_price', GREATEST(_plan_price - discount, 0)
  );
END;
$$;
