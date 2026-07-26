-- Point the seeded Helna coach at the demo login email (idempotent).
UPDATE users
SET email = 'helna@abstrack.com',
    display_name = 'Helna'
WHERE firebase_uid = 'dev-local-user'
  AND role = 'coach';
