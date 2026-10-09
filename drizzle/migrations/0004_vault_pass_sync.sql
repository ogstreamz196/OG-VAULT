CREATE TABLE IF NOT EXISTS public.vault_sync_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  api_key text,
  status text NOT NULL DEFAULT 'not_configured',
  key_name text,
  active_count int,
  last_synced_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.vault_sync_settings TO service_role;
ALTER TABLE public.vault_sync_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.vault_sync_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.vault_credentials ADD COLUMN IF NOT EXISTS synced_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS vault_credentials_username_lower_idx ON public.vault_credentials (lower(username));
COMMENT ON TABLE public.vault_sync_meta IS 'DEPRECATED: webhook receiver replaced by vault_sync_settings pull sync';
COMMENT ON COLUMN public.vault_credentials.external_id IS 'DEPRECATED: unused by pull sync';