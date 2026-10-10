CREATE TABLE public.store_broadcast (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  message text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  style text NOT NULL DEFAULT 'info',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_broadcast TO anon, authenticated;
GRANT INSERT, UPDATE ON public.store_broadcast TO authenticated;
GRANT ALL ON public.store_broadcast TO service_role;
ALTER TABLE public.store_broadcast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broadcast public read" ON public.store_broadcast FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "broadcast admin insert" ON public.store_broadcast FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "broadcast admin update" ON public.store_broadcast FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.store_broadcast (id) VALUES (1);