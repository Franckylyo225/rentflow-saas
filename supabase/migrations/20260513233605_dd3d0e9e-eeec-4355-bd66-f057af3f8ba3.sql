
-- ============ Tables ============
CREATE TABLE public.early_adopter_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.early_adopters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discount_percent INTEGER NOT NULL DEFAULT 25,
  free_months INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applied_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_early_adopters_user ON public.early_adopters(user_id);
CREATE INDEX idx_early_adopters_email ON public.early_adopters(email);

-- ============ Initial config ============
INSERT INTO public.early_adopter_config (key, value) VALUES
  ('active', 'true'),
  ('total_slots', '100'),
  ('slots_taken', '77'),
  ('discount_percent', '25'),
  ('free_months', '3'),
  ('price_before', '20000'),
  ('price_after', '15000'),
  ('label', 'Early Adopter'),
  ('description', 'Réduction garantie à vie pour les 100 premiers utilisateurs'),
  ('expires_at', '');

-- ============ RLS ============
ALTER TABLE public.early_adopter_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.early_adopters ENABLE ROW LEVEL SECURITY;

-- early_adopter_config : lecture publique (anon + auth), écriture super admin
CREATE POLICY "Anyone can read early adopter config"
  ON public.early_adopter_config FOR SELECT
  USING (true);

CREATE POLICY "Super admins can insert config"
  ON public.early_adopter_config FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update config"
  ON public.early_adopter_config FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete config"
  ON public.early_adopter_config FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- early_adopters : user lit le sien, super admin tout
CREATE POLICY "Users can view their own early adopter row"
  ON public.early_adopters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert early adopters"
  ON public.early_adopters FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update early adopters"
  ON public.early_adopters FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete early adopters"
  ON public.early_adopters FOR DELETE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ============ Trigger updated_at ============
CREATE TRIGGER update_early_adopter_config_updated_at
BEFORE UPDATE ON public.early_adopter_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_early_adopters_updated_at
BEFORE UPDATE ON public.early_adopters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Auto-attribution sur signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user_early_adopter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _active TEXT;
  _total INTEGER;
  _taken INTEGER;
  _discount INTEGER;
  _free_months INTEGER;
  _expires TEXT;
BEGIN
  SELECT value INTO _active FROM public.early_adopter_config WHERE key = 'active';
  IF COALESCE(_active, 'false') <> 'true' THEN RETURN NEW; END IF;

  SELECT value INTO _expires FROM public.early_adopter_config WHERE key = 'expires_at';
  IF _expires IS NOT NULL AND _expires <> '' THEN
    BEGIN
      IF _expires::timestamptz < now() THEN RETURN NEW; END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  SELECT value::int INTO _total FROM public.early_adopter_config WHERE key = 'total_slots';
  SELECT value::int INTO _taken FROM public.early_adopter_config WHERE key = 'slots_taken';
  SELECT value::int INTO _discount FROM public.early_adopter_config WHERE key = 'discount_percent';
  SELECT value::int INTO _free_months FROM public.early_adopter_config WHERE key = 'free_months';

  IF _taken >= _total THEN RETURN NEW; END IF;

  INSERT INTO public.early_adopters (user_id, email, discount_percent, free_months)
  VALUES (NEW.id, NEW.email, COALESCE(_discount, 25), COALESCE(_free_months, 3));

  UPDATE public.early_adopter_config SET value = ((_taken + 1)::text), updated_at = now()
    WHERE key = 'slots_taken';

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_early_adopter
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_early_adopter();

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.get_user_early_adopter_status(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.early_adopters%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM public.early_adopters
    WHERE user_id = _user_id AND is_active = true
    ORDER BY joined_at DESC LIMIT 1;
  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('is_early_adopter', false);
  END IF;
  RETURN jsonb_build_object(
    'is_early_adopter', true,
    'discount_percent', _row.discount_percent,
    'free_months', _row.free_months,
    'joined_at', _row.joined_at,
    'applied_at', _row.applied_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_early_adopter_public_config()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB := '{}'::jsonb;
  _r RECORD;
BEGIN
  FOR _r IN SELECT key, value FROM public.early_adopter_config LOOP
    _result := _result || jsonb_build_object(_r.key, _r.value);
  END LOOP;
  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_early_adopter_status(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_early_adopter_public_config() TO authenticated, anon;
