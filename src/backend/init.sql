CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS layout_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL,
  name TEXT,
  type TEXT,
  x INT,
  y INT,
  width INT,
  height INT,
  z_index INT,
  rotation INT,
  online_only BOOLEAN,
  background_color TEXT,
  assigned_playlist_id UUID,
  assigned_media_id UUID,
  settings_json TEXT,
  owner_email TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Optional starter data (safe to keep)
INSERT INTO playlists (name)
SELECT 'Default Playlist'
WHERE NOT EXISTS (SELECT 1 FROM playlists);
