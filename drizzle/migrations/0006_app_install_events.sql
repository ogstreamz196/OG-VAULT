CREATE TABLE public.app_install_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id uuid NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('download_started','download_completed','download_failed','install_prompted','install_failed')),
  platform text NOT NULL DEFAULT 'web',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_install_events_created_idx ON public.app_install_events (created_at DESC);
CREATE INDEX app_install_events_app_idx ON public.app_install_events (app_id, created_at DESC);
GRANT SELECT, INSERT ON public.app_install_events TO authenticated;
GRANT ALL ON public.app_install_events TO service_role;
ALTER TABLE public.app_install_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users log own events" ON public.app_install_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND char_length(coalesce(error_message,'')) <= 500);
CREATE POLICY "Admins read events" ON public.app_install_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));