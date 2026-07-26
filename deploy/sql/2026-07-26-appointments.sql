-- Safe incremental schema for coach calendar + member appointment booking.

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('booked', 'cancelled', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title text,
  notes text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status appointment_status NOT NULL DEFAULT 'booked',
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_tenant_coach_start_idx
  ON appointments (tenant_id, coach_id, starts_at);
CREATE INDEX IF NOT EXISTS appointments_tenant_member_start_idx
  ON appointments (tenant_id, member_id, starts_at);

CREATE TABLE IF NOT EXISTS availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS availability_blocks_tenant_coach_start_idx
  ON availability_blocks (tenant_id, coach_id, starts_at);
