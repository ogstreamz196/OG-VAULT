DROP POLICY IF EXISTS "apps read by audience" ON public.apps;
CREATE POLICY "apps read by audience" ON public.apps FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR (is_active AND (user_level(auth.uid()) = ANY (audiences) OR 'vip' = ANY (audiences))));