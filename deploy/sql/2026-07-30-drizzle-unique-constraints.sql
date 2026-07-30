-- Named unique constraints expected by drizzle schema (non-interactive local/prod apply).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_tenant_email_uid'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_tenant_email_uid UNIQUE (tenant_id, email);
  END IF;
END $$;

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_tenant_import_key_uid_test;
