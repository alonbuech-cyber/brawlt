-- Add player_tag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS player_tag text;
CREATE INDEX IF NOT EXISTS idx_profiles_player_tag ON profiles(player_tag);

-- Make image_url nullable (no longer required for API-based submissions)
ALTER TABLE submissions ALTER COLUMN image_url DROP NOT NULL;
