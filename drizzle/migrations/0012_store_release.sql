-- Single-row record of the latest 0G VAULT store APK, used for in-app self-update.
CREATE TABLE public.store_release (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version text NOT NULL DEFAULT '',
  build_number integer NOT NULL DEFAULT 0,
  apk_url text,
  changelog text NOT NULL DEFAULT '',
  is_mandatory boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_release TO anon, authenticated;
GRANT INSERT, UPDATE ON public.store_release TO authenticated;
GRANT ALL ON public.store_release TO service_role;
ALTER TABLE public.store_release ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store release public read" ON public.store_release FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "store release admin insert" ON public.store_release FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "store release admin update" ON public.store_release FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.store_release (id) VALUES (1);
