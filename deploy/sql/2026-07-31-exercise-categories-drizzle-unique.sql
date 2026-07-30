-- Backfill drizzle-named unique on exercise_categories (fixes db:push interactive prompt).

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
