-- Create default decks for subjects that do not have a default deck
INSERT INTO deck (id, name, is_default, subject_id, user_id, created_at, updated_at)
SELECT 
  gen_random_uuid()::text,
  'General',
  true,
  s.id,
  s.user_id,
  NOW(),
  NOW()
FROM subject s
WHERE NOT EXISTS (
  SELECT 1 FROM deck d WHERE d.subject_id = s.id AND d.is_default = true
);
