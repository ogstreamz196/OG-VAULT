CREATE TABLE public.vault_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  username text NOT NULL UNIQUE,
  password text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vault_credentials_username_lower ON public.vault_credentials (lower(username));
GRANT ALL ON public.vault_credentials TO service_role;
ALTER TABLE public.vault_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.vault_sync_meta (
  id integer PRIMARY KEY DEFAULT 1,
  last_ping_at timestamptz,
  last_event_at timestamptz
);
GRANT ALL ON public.vault_sync_meta TO service_role;
ALTER TABLE public.vault_sync_meta ENABLE ROW LEVEL SECURITY;
INSERT INTO public.vault_sync_meta (id) VALUES (1) ON CONFLICT DO NOTHING;