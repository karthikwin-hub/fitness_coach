ALTER TABLE members
  ADD COLUMN IF NOT EXISTS whatsapp_updates_opt_in boolean NOT NULL DEFAULT false;
