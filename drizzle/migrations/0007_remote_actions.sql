CREATE TABLE public.remote_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Terminal',
  command text NOT NULL,
  needs_confirmation boolean NOT NULL DEFAULT false,
  needs_package boolean NOT NULL DEFAULT false,
  audiences text[] NOT NULL DEFAULT '{free,vip}',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remote_actions TO authenticated;
GRANT ALL ON public.remote_actions TO service_role;
ALTER TABLE public.remote_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "remote actions admin write" ON public.remote_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "remote actions read by audience" ON public.remote_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR (is_active AND public.user_level(auth.uid()) = ANY(audiences)));
INSERT INTO public.remote_actions (label, description, icon, command, needs_confirmation, needs_package, sort_order) VALUES
 ('Trim System Caches','Frees up storage by clearing app caches','Trash2','pm trim-caches 999G',false,false,1),
 ('Kill Background Apps','Stops apps running in the background','Zap','am kill-all',false,false,2),
 ('Check Free Space','Shows how much storage is left','HardDrive','df -h /data',false,false,3),
 ('Clear App Data','Resets the selected app completely','Eraser','pm clear {package}',true,true,4),
 ('Force Stop App','Closes the selected app if frozen','Square','am force-stop {package}',false,true,5),
 ('Reboot Firestick','Restarts the Firestick','Power','reboot',true,false,6);