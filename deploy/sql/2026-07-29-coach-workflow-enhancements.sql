-- Coach workflow enhancements: invited members, import keys, feature flags, voice notes, plan templates

ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'invited';

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS features_json jsonb NOT NULL DEFAULT '{}';

ALTER TABLE members ADD COLUMN IF NOT EXISTS import_key text;
CREATE UNIQUE INDEX IF NOT EXISTS members_tenant_import_key_uid
  ON members (tenant_id, import_key) WHERE import_key IS NOT NULL;

ALTER TABLE plan_templates ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE plan_templates ADD COLUMN IF NOT EXISTS tags_json jsonb NOT NULL DEFAULT '[]';
ALTER TABLE plan_templates ADD COLUMN IF NOT EXISTS source_member_id uuid REFERENCES members(id);
ALTER TABLE plan_templates ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TYPE plan_template_type ADD VALUE IF NOT EXISTS 'plan_bundle';

ALTER TABLE plan_deliveries ADD COLUMN IF NOT EXISTS coach_voice_note_url text;
ALTER TABLE plan_deliveries ADD COLUMN IF NOT EXISTS coach_voice_note_duration_sec integer;

ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS coach_voice_note_url text;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS coach_voice_note_duration_sec integer;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_duration_sec integer;
