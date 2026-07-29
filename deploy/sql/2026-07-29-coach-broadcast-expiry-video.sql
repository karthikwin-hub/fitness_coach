-- Coach broadcast video + display expiry; tenant data retention policy

ALTER TABLE coach_broadcasts
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS retention_days integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS last_purge_at timestamptz;
