CREATE UNIQUE INDEX IF NOT EXISTS partner_agencies_short_name_key ON public.partner_agencies (lower(short_name)) WHERE short_name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_partner_brand(_handle text)
RETURNS TABLE (handle text, wallet_name text, agency_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(short_name), COALESCE(NULLIF(trim(brand_name), ''), name), name
  FROM public.partner_agencies
  WHERE short_name IS NOT NULL AND lower(short_name) = lower(_handle) AND status = 'active'
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_partner_brand(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_brand(text) TO anon, authenticated;
