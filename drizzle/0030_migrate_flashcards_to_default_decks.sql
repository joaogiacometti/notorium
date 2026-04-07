-- Create default decks for subjects that have flashcards but no default deck
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
WHERE EXISTS (
  SELECT 1 FROM flashcard f WHERE f.subject_id = s.id
)
AND NOT EXISTS (
  SELECT 1 FROM deck d WHERE d.subject_id = s.id AND d.is_default = true
)
AND s.archived_at IS NULL;

-- Update flashcards with NULL deck_id to point to the default deck
UPDATE flashcard f
SET deck_id = d.id
FROM deck d
WHERE f.deck_id IS NULL
  AND f.subject_id = d.subject_id
  AND f.user_id = d.user_id
  AND d.is_default = true;
