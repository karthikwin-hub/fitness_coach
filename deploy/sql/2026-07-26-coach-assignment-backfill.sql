-- Backfill members.coach_id to the tenant's canonical coach.
-- Prefers the live Firebase coach over the dev seed coach (firebase_uid = dev-local-user).

UPDATE members m
SET coach_id = c.id
FROM (
  SELECT DISTINCT ON (tenant_id) id, tenant_id
  FROM users
  WHERE role = 'coach'
  ORDER BY
    tenant_id,
    CASE WHEN firebase_uid = 'dev-local-user' THEN 1 ELSE 0 END,
    created_at ASC NULLS LAST
) c
WHERE m.tenant_id = c.tenant_id
  AND (m.coach_id IS DISTINCT FROM c.id);
