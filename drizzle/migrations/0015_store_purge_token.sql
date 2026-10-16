-- Boss-triggered "purge & refresh": devices that see a new token wipe their web caches and reload.
ALTER TABLE public.store_release ADD COLUMN IF NOT EXISTS purge_token text;
-- Read/write access is inherited from store_release: everyone can read, only admins can update.
