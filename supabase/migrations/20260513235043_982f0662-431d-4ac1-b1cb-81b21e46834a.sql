-- Backfill early_adopters for all existing users
DO $$
DECLARE
  _discount INTEGER;
  _free_months INTEGER;
BEGIN
  SELECT COALESCE((SELECT value::int FROM public.early_adopter_config WHERE key = 'discount_percent'), 25) INTO _discount;
  SELECT COALESCE((SELECT value::int FROM public.early_adopter_config WHERE key = 'free_months'), 3) INTO _free_months;

  INSERT INTO public.early_adopters (user_id, email, discount_percent, free_months, is_active)
  SELECT u.id, u.email, _discount, _free_months, true
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.early_adopters ea WHERE ea.user_id = u.id
  );

  -- Update slots_taken counter
  UPDATE public.early_adopter_config
  SET value = (SELECT COUNT(*)::text FROM public.early_adopters WHERE is_active = true),
      updated_at = now()
  WHERE key = 'slots_taken';
END $$;