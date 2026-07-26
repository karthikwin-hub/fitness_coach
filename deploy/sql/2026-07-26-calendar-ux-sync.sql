-- Additive calendar UX, recurring availability, meeting details, and Google sync.

DO $$ BEGIN
  CREATE TYPE meeting_type AS ENUM (
    'none', 'in_person', 'google_meet', 'zoom', 'whatsapp'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS meeting_type meeting_type NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS join_url text,
  ADD COLUMN IF NOT EXISTS google_event_id text;

ALTER TABLE availability_blocks
  ADD COLUMN IF NOT EXISTS google_event_id text;

CREATE TABLE IF NOT EXISTS availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  reason text,
  starts_on date NOT NULL,
  ends_on date,
  google_event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS availability_rules_tenant_coach_idx
  ON availability_rules (tenant_id, coach_id);

CREATE TABLE IF NOT EXISTS coach_calendar_settings (
  coach_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  preferred_meeting_type meeting_type NOT NULL DEFAULT 'none',
  default_location text,
  default_zoom_url text,
  default_whatsapp_url text,
  time_zone text NOT NULL DEFAULT 'Europe/London',
  google_refresh_token text,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  google_email text,
  google_connected_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
