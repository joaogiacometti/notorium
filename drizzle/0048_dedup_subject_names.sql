-- Resolve duplicate subject names per user before enforcing uniqueness on
-- (user_id, name). For each (user_id, name) group the earliest subject
-- (by created_at, then id) keeps its name; every later exact-name duplicate is
-- renamed to "<name> (n)", picking the lowest n whose result does not already
-- exist for that user. The set of names is re-checked on every pass, so the
-- chosen name never collides, including with names produced by earlier renames
-- in this migration. Runs entirely in SQL; no application script required.
DO $$
DECLARE
  dup RECORD;
  candidate text;
  suffix integer;
BEGIN
  LOOP
    SELECT ranked.id, ranked.user_id, ranked.name
      INTO dup
    FROM (
      SELECT
        id,
        user_id,
        name,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, name
          ORDER BY created_at, id
        ) AS rn
      FROM "subject"
    ) AS ranked
    WHERE ranked.rn > 1
    LIMIT 1;

    EXIT WHEN NOT FOUND;

    suffix := 2;
    LOOP
      candidate := dup.name || ' (' || suffix || ')';
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM "subject"
        WHERE user_id = dup.user_id AND name = candidate
      );
      suffix := suffix + 1;
    END LOOP;

    UPDATE "subject"
      SET name = candidate,
          updated_at = now()
    WHERE id = dup.id;
  END LOOP;
END $$;
