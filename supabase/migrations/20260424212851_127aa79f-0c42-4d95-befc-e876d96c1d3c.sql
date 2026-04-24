
-- Ajoute le logo RentFlow dans l'en-tête de tous les templates email plateforme
-- en remplaçant le <h1> actuel par un bloc logo + titre.
DO $$
DECLARE
  logo_url TEXT := 'https://dljpgpplvqhhfndpsihz.supabase.co/storage/v1/object/public/logos/platform%2Frentflow-logo.png';
  logo_block TEXT;
BEGIN
  logo_block := '<img src="' || logo_url || '" alt="RentFlow" height="40" style="display:block;margin:0 auto 12px;max-height:40px;width:auto;border:0;outline:none;text-decoration:none" />';

  -- Insère le logo juste avant chaque <h1 ...> dans tous les templates plateforme,
  -- uniquement s'il n'est pas déjà présent (idempotent).
  UPDATE public.platform_email_templates
  SET html_content = regexp_replace(
        html_content,
        '(<div[^>]*style="[^"]*padding:32px 24px;text-align:center[^"]*"[^>]*>)(\s*)(<h1)',
        '\1' || logo_block || '\3',
        'g'
      ),
      updated_at = now()
  WHERE html_content NOT LIKE '%platform%2Frentflow-logo.png%'
    AND html_content NOT LIKE '%platform/rentflow-logo.png%';
END $$;
