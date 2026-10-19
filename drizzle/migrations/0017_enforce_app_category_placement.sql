CREATE OR REPLACE FUNCTION public.enforce_app_category_placement() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE selected_boss boolean;
BEGIN
  IF NEW.audiences = ARRAY['boss']::text[] THEN
    SELECT is_boss INTO selected_boss FROM public.categories WHERE id = NEW.category_id;
    IF selected_boss IS DISTINCT FROM true THEN
      SELECT id INTO NEW.category_id FROM public.categories WHERE is_boss ORDER BY sort_order, created_at, id LIMIT 1;
      IF NEW.category_id IS NULL THEN RAISE EXCEPTION 'Create a Boss only category before saving boss-only apps'; END IF;
    END IF;
  END IF;
  IF NEW.category_id IS NULL THEN RAISE EXCEPTION 'Select a category before saving this app'; END IF;
  SELECT is_boss INTO selected_boss FROM public.categories WHERE id = NEW.category_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Select an existing category'; END IF;
  IF selected_boss THEN NEW.audiences := ARRAY['boss']::text[]; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER apps_enforce_category_placement BEFORE INSERT OR UPDATE ON public.apps FOR EACH ROW EXECUTE FUNCTION public.enforce_app_category_placement();
ALTER TABLE public.apps ADD CONSTRAINT apps_category_required CHECK (category_id IS NOT NULL) NOT VALID;
ALTER TABLE public.apps VALIDATE CONSTRAINT apps_category_required;
CREATE OR REPLACE FUNCTION public.guard_app_category() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.apps WHERE category_id = OLD.id) THEN RAISE EXCEPTION 'Move apps to another category before removing this category'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.is_boss AND NOT NEW.is_boss AND EXISTS (SELECT 1 FROM public.apps WHERE category_id = OLD.id AND audiences = ARRAY['boss']::text[]) THEN
    RAISE EXCEPTION 'Move boss-only apps to another Boss only category first';
  END IF;
  IF NOT OLD.is_boss AND NEW.is_boss THEN
    UPDATE public.apps SET audiences = ARRAY['boss']::text[], updated_at = now() WHERE category_id = OLD.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER categories_guard_app_placement BEFORE DELETE OR UPDATE OF is_boss ON public.categories FOR EACH ROW EXECUTE FUNCTION public.guard_app_category();