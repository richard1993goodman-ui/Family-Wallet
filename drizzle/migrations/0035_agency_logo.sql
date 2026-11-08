ALTER TABLE public.partner_agencies ADD COLUMN IF NOT EXISTS logo_data text;
ALTER TABLE public.partner_agencies ADD CONSTRAINT partner_agencies_logo_size CHECK (logo_data IS NULL OR (length(logo_data) <= 400000 AND logo_data LIKE 'data:image/%'));
CREATE OR REPLACE FUNCTION public.get_partner_logo(_handle text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT logo_data FROM public.partner_agencies
  WHERE short_name IS NOT NULL AND lower(short_name) = lower(_handle) AND status = 'active' LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_partner_logo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_logo(text) TO anon, authenticated;