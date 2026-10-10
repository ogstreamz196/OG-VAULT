ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_boss boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_browse_app(_user_id uuid, _audiences text[], _category_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(_user_id,'admin') THEN true
    WHEN 'boss' = ANY(_audiences) AND NOT (_audiences && ARRAY['guest','free','vip']) THEN false
    WHEN _category_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.categories c WHERE c.id = _category_id AND c.is_boss) THEN false
    ELSE CASE public.user_level(_user_id)
      WHEN 'vip' THEN _audiences && ARRAY['guest','free','vip']
      WHEN 'free' THEN _audiences && ARRAY['free','vip']
      WHEN 'guest' THEN 'guest' = ANY(_audiences)
      ELSE false END
  END
$$;
GRANT EXECUTE ON FUNCTION public.can_browse_app(uuid, text[], uuid) TO authenticated;

DROP POLICY IF EXISTS "apps read by audience" ON public.apps;
CREATE POLICY "apps read by audience" ON public.apps FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR (is_active AND public.can_browse_app(auth.uid(), audiences, category_id)));

DROP POLICY IF EXISTS "categories public read" ON public.categories;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated
USING (NOT is_boss OR public.has_role(auth.uid(),'admin'));