-- Boss-defined order of apps inside each category (lower first; ties fall back to newest first).
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Seed the current order: newest first within each category, numbered from 1.
UPDATE public.apps a
SET sort_order = ranked.pos
FROM (
  SELECT id, row_number() OVER (PARTITION BY category_id ORDER BY created_at DESC) AS pos
  FROM public.apps
) ranked
WHERE a.id = ranked.id;

-- The existing "apps admin write" policy (FOR ALL, admin only) already covers updates to this column.
CREATE INDEX IF NOT EXISTS apps_category_sort_idx ON public.apps (category_id, sort_order);
