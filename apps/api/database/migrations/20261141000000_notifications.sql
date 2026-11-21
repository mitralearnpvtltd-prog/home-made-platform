-- Aahaa — in-app notifications and customer notification preferences.
-- Existing accounts retain their data; preferences are initialized as enabled.

BEGIN;

CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  order_updates BOOLEAN NOT NULL DEFAULT TRUE,
  offers_promotions BOOLEAN NOT NULL DEFAULT TRUE,
  nearby_home_cooks BOOLEAN NOT NULL DEFAULT TRUE,
  general_updates BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER notification_preferences_set_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  category TEXT NOT NULL
    CONSTRAINT notifications_category_check
      CHECK (category IN (
        'order_updates',
        'offers_promotions',
        'nearby_home_cooks',
        'general_updates'
      )),
  title TEXT NOT NULL
    CONSTRAINT notifications_title_check
      CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  body TEXT NOT NULL
    CONSTRAINT notifications_body_check
      CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  icon_type TEXT,
  action_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
    CONSTRAINT notifications_metadata_object_check
      CHECK (jsonb_typeof(metadata) = 'object'),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_read_timestamp_check
    CHECK ((is_read AND read_at IS NOT NULL) OR (NOT is_read AND read_at IS NULL))
);

CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = FALSE AND dismissed_at IS NULL;
CREATE INDEX notifications_user_category_idx
  ON public.notifications (user_id, category, created_at DESC);

CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Supabase may grant broad privileges to new public tables by default.
-- Clear client-facing table grants before applying the intended column grants.
REVOKE ALL PRIVILEGES ON TABLE
  public.notification_preferences,
  public.notifications
FROM PUBLIC, anon, authenticated;

GRANT SELECT, UPDATE (
  order_updates,
  offers_promotions,
  nearby_home_cooks,
  general_updates
) ON TABLE public.notification_preferences TO authenticated;
GRANT SELECT, UPDATE (is_read, read_at, dismissed_at)
  ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.notification_preferences, public.notifications
  TO service_role;

CREATE POLICY notification_preferences_select_own
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY notification_preferences_update_own
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Existing customer accounts receive enabled defaults without changing profile data.
INSERT INTO public.notification_preferences (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- The existing on_auth_user_created trigger creates the profile first. PostgreSQL
-- orders same-event triggers by name, so this trigger runs after that profile trigger.
CREATE OR REPLACE FUNCTION public.create_notification_preferences_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_z_notification_preferences_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_notification_preferences_for_new_user();

-- Enforce category preferences for all insertion paths, including future event
-- handlers. A suppressed row is not inserted and existing rows are never recreated.
CREATE OR REPLACE FUNCTION public.enforce_notification_category_preference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  category_enabled BOOLEAN;
BEGIN
  SELECT CASE NEW.category
    WHEN 'order_updates' THEN order_updates
    WHEN 'offers_promotions' THEN offers_promotions
    WHEN 'nearby_home_cooks' THEN nearby_home_cooks
    WHEN 'general_updates' THEN general_updates
  END
  INTO category_enabled
  FROM public.notification_preferences
  WHERE user_id = NEW.user_id
  FOR SHARE;

  IF NOT COALESCE(category_enabled, TRUE) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_enforce_category_preference
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_notification_category_preference();

-- These functions are trigger-only, not RPCs. Keep them owned by the trusted
-- Supabase database owner and remove client EXECUTE grants after trigger creation.
ALTER FUNCTION public.create_notification_preferences_for_new_user()
  OWNER TO postgres;
ALTER FUNCTION public.enforce_notification_category_preference()
  OWNER TO postgres;

REVOKE ALL PRIVILEGES
  ON FUNCTION public.create_notification_preferences_for_new_user()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES
  ON FUNCTION public.enforce_notification_category_preference()
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.notifications IS
  'In-app customer notifications. All API access must scope rows to the authenticated recipient.';
COMMENT ON TABLE public.notification_preferences IS
  'Per-customer category preferences; all categories default to enabled.';

COMMIT;
