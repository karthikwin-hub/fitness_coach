-- Safe incremental schema for plan delivery + template slugs (no truncates).

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE plan_templates ADD COLUMN IF NOT EXISTS key text;

UPDATE exercises
SET slug = 'legacy-' || replace(id::text, '-', '')
WHERE slug IS NULL;

UPDATE plan_templates
SET key = COALESCE(key, type::text)
WHERE key IS NULL;

UPDATE plan_templates pt
SET key = pt.type::text || '-' || replace(pt.id::text, '-', '')
WHERE EXISTS (
  SELECT 1 FROM plan_templates other
  WHERE other.tenant_id = pt.tenant_id
    AND other.key = pt.key
    AND other.id < pt.id
);

CREATE UNIQUE INDEX IF NOT EXISTS exercises_tenant_slug_uid
  ON exercises (tenant_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS plan_templates_tenant_key_uid
  ON plan_templates (tenant_id, key);

CREATE TABLE IF NOT EXISTS plan_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  training_plan_id uuid,
  nutrition_plan_id uuid,
  week_label text NOT NULL,
  snapshot_json jsonb NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  email_sent_at timestamptz,
  whatsapp_sent_at timestamptz,
  first_opened_at timestamptz,
  open_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plan_deliveries_member_idx
  ON plan_deliveries (member_id, created_at);

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'platform_admin';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tenant_status AS ENUM ('active', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain text;
DO $$ BEGIN
  ALTER TABLE tenants ADD COLUMN status tenant_status NOT NULL DEFAULT 'active';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_subdomain_unique ON tenants (subdomain);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_custom_domain_unique ON tenants (custom_domain);
