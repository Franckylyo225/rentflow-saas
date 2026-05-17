
-- 1) Function: subscription active for an org
CREATE OR REPLACE FUNCTION public.is_org_subscription_active(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN status = 'trial'  AND trial_ends_at IS NOT NULL AND trial_ends_at > now() THEN true
      WHEN status = 'active' AND (current_period_end IS NULL OR current_period_end > now()) THEN true
      ELSE false
    END
    FROM public.subscriptions
    WHERE organization_id = _org_id
    LIMIT 1
  ), false);
$$;

-- 2) Resolvers
CREATE OR REPLACE FUNCTION public.resolve_org_from_property(_pid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT organization_id FROM public.properties WHERE id = _pid $$;

CREATE OR REPLACE FUNCTION public.resolve_org_from_unit(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT p.organization_id FROM public.units u JOIN public.properties p ON p.id=u.property_id WHERE u.id=_uid $$;

CREATE OR REPLACE FUNCTION public.resolve_org_from_tenant(_tid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT p.organization_id FROM public.tenants t JOIN public.units u ON u.id=t.unit_id JOIN public.properties p ON p.id=u.property_id WHERE t.id=_tid $$;

CREATE OR REPLACE FUNCTION public.resolve_org_from_rent_payment(_rid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT public.resolve_org_from_tenant(tenant_id) FROM public.rent_payments WHERE id=_rid $$;

-- 3) Generic enforcement trigger
CREATE OR REPLACE FUNCTION public.enforce_subscription_active()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _col  text := TG_ARGV[0];
  _kind text := TG_ARGV[1];
  _val  uuid;
  _org  uuid;
  _row  record;
BEGIN
  -- Bypass for server-side (no JWT) and super admins
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF public.is_super_admin(auth.uid()) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _row := COALESCE(NEW, OLD);
  EXECUTE format('SELECT ($1).%I', _col) INTO _val USING _row;

  IF _val IS NULL THEN
    RETURN _row;
  END IF;

  _org := CASE _kind
    WHEN 'org'          THEN _val
    WHEN 'property'     THEN public.resolve_org_from_property(_val)
    WHEN 'unit'         THEN public.resolve_org_from_unit(_val)
    WHEN 'tenant'       THEN public.resolve_org_from_tenant(_val)
    WHEN 'rent_payment' THEN public.resolve_org_from_rent_payment(_val)
  END;

  IF _org IS NOT NULL AND NOT public.is_org_subscription_active(_org) THEN
    RAISE EXCEPTION 'Abonnement expiré : votre agence est en lecture seule. Renouvelez votre abonnement pour reprendre la saisie.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN _row;
END;
$$;

-- 4) Attach triggers
DO $$
DECLARE
  r record;
  defs text[][] := ARRAY[
    ['properties',          'organization_id',  'org'],
    ['units',               'property_id',      'property'],
    ['tenants',             'unit_id',          'unit'],
    ['rent_payments',       'tenant_id',        'tenant'],
    ['contracts',           'tenant_id',        'tenant'],
    ['lease_documents',     'tenant_id',        'tenant'],
    ['bail_terminations',   'tenant_id',        'tenant'],
    ['escalation_tasks',    'rent_payment_id',  'rent_payment'],
    ['expenses',            'organization_id',  'org'],
    ['employees',           'organization_id',  'org'],
    ['patrimony_assets',    'organization_id',  'org'],
    ['asset_holders',       'organization_id',  'org'],
    ['property_listings',   'organization_id',  'org'],
    ['property_sales',      'organization_id',  'org'],
    ['contract_templates',  'organization_id',  'org'],
    ['email_templates',     'organization_id',  'org'],
    ['sms_templates',       'organization_id',  'org'],
    ['sms_schedules',       'organization_id',  'org'],
    ['expense_categories',  'organization_id',  'org'],
    ['custom_roles',        'organization_id',  'org']
  ];
  i int;
BEGIN
  FOR i IN 1 .. array_length(defs, 1) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS enforce_sub_%1$s ON public.%1$s;', defs[i][1]);
    EXECUTE format(
      'CREATE TRIGGER enforce_sub_%1$s BEFORE INSERT OR UPDATE OR DELETE ON public.%1$s
       FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_active(%2$L, %3$L);',
      defs[i][1], defs[i][2], defs[i][3]
    );
  END LOOP;
END $$;
