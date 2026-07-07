-- BRÄVE Studio — add gamification + last visited section to profiles
-- Apply via Supabase Dashboard > SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_visited_section TEXT,
  ADD COLUMN IF NOT EXISTS level INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp_total INT DEFAULT 0;

COMMENT ON COLUMN profiles.last_visited_section IS 'Last app section the user visited — for "continue where you left off"';
COMMENT ON COLUMN profiles.level IS 'BRÄVE level (gamification, persisted)';
COMMENT ON COLUMN profiles.xp_total IS 'Total XP accumulated (gamification, persisted)';