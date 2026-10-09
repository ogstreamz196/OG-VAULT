CREATE TABLE public.storage_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  account_id text,
  access_key_id text,
  secret_access_key text,
  bucket text,
  public_base_url text DEFAULT 'https://download.fireunlock.co.uk',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.storage_settings TO service_role;
ALTER TABLE public.storage_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.storage_settings (id) VALUES (1) ON CONFLICT DO NOTHING;