-- Soft archive for plan templates (coach-managed bundles).

ALTER TABLE plan_templates ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS plan_templates_tenant_archived_idx
  ON plan_templates (tenant_id, archived_at);
