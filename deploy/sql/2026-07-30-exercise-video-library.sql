-- Exercise video library: tenant categories + owned/third-party source

DO $$ BEGIN
  CREATE TYPE exercise_video_source AS ENUM ('owned', 'third_party');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS exercise_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES exercise_categories(id);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_source exercise_video_source NOT NULL DEFAULT 'third_party';

CREATE INDEX IF NOT EXISTS exercise_categories_tenant_idx ON exercise_categories (tenant_id);
CREATE INDEX IF NOT EXISTS exercises_category_idx ON exercises (category_id);

-- Drizzle expects this exact constraint name (avoids interactive db:push truncate prompt).
DO $$
DECLARE
  old_con text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exercise_categories_tenant_slug_uid'
  ) THEN
    SELECT c.conname INTO old_con
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'exercise_categories'
      AND c.contype = 'u'
    LIMIT 1;

    IF old_con IS NOT NULL THEN
      EXECUTE format('ALTER TABLE exercise_categories DROP CONSTRAINT %I', old_con);
    END IF;

    ALTER TABLE exercise_categories
      ADD CONSTRAINT exercise_categories_tenant_slug_uid UNIQUE (tenant_id, slug);
  END IF;
END $$;
