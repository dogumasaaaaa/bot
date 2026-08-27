/*
# Create YouTube Frontend Schema (Multi-user with Auth)

This migration creates the full data model for a custom YouTube frontend powered by Invidious.
Each user has their own subscriptions, watch history, playlists, liked videos, watch-later queue, and preferences.

1. New Tables
- `subscriptions`: Channels a user has subscribed to (user_id, channel_id, channel_name, channel_thumbnail, created_at)
- `watch_history`: Videos a user has watched (user_id, video_id, title, author, author_id, thumbnail, length_seconds, watched_at)
- `playlists`: User-created playlists (id, user_id, title, description, created_at, updated_at)
- `playlist_items`: Videos within a playlist (id, playlist_id, video_id, title, author, author_id, thumbnail, length_seconds, position, added_at)
- `liked_videos`: Videos a user has liked (user_id, video_id, title, author, author_id, thumbnail, length_seconds, liked_at)
- `watch_later`: Videos saved to watch later (user_id, video_id, title, author, author_id, thumbnail, length_seconds, added_at)
- `preferences`: Per-user app preferences (user_id, autoplay, default_quality, theme, created_at, updated_at)

2. Security
- RLS enabled on every table.
- All tables are owner-scoped: each authenticated user can only CRUD their own rows.
- Owner columns default to auth.uid() so inserts that omit user_id succeed.
- playlist_items scoped through parent playlist ownership check.
- preferences is single-row-per-user (user_id is primary key).

3. Indexes
- subscriptions: (user_id), (user_id, channel_id) unique
- watch_history: (user_id, watched_at desc), (user_id, video_id) unique
- playlists: (user_id)
- playlist_items: (playlist_id, position)
- liked_videos: (user_id, liked_at desc), (user_id, video_id) unique
- watch_later: (user_id, added_at desc), (user_id, video_id) unique
- preferences: (user_id) -- primary key
*/

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  channel_name text NOT NULL,
  channel_thumbnail text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, channel_id)
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_channel ON subscriptions(user_id, channel_id);

DROP POLICY IF EXISTS "select_own_subscriptions" ON subscriptions;
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_subscriptions" ON subscriptions;
CREATE POLICY "update_own_subscriptions" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_subscriptions" ON subscriptions;
CREATE POLICY "delete_own_subscriptions" ON subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Watch History
CREATE TABLE IF NOT EXISTS watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  title text NOT NULL,
  author text,
  author_id text,
  thumbnail text,
  length_seconds integer,
  watched_at timestamptz DEFAULT now(),
  UNIQUE (user_id, video_id)
);
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_history_user_watched ON watch_history(user_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_user_video ON watch_history(user_id, video_id);

DROP POLICY IF EXISTS "select_own_history" ON watch_history;
CREATE POLICY "select_own_history" ON watch_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_history" ON watch_history;
CREATE POLICY "insert_own_history" ON watch_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_history" ON watch_history;
CREATE POLICY "update_own_history" ON watch_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_history" ON watch_history;
CREATE POLICY "delete_own_history" ON watch_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Playlists
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);

DROP POLICY IF EXISTS "select_own_playlists" ON playlists;
CREATE POLICY "select_own_playlists" ON playlists FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_playlists" ON playlists;
CREATE POLICY "insert_own_playlists" ON playlists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_playlists" ON playlists;
CREATE POLICY "update_own_playlists" ON playlists FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_playlists" ON playlists;
CREATE POLICY "delete_own_playlists" ON playlists FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Playlist Items
CREATE TABLE IF NOT EXISTS playlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  title text NOT NULL,
  author text,
  author_id text,
  thumbnail text,
  length_seconds integer,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now()
);
ALTER TABLE playlist_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_pos ON playlist_items(playlist_id, position);

DROP POLICY IF EXISTS "select_own_playlist_items" ON playlist_items;
CREATE POLICY "select_own_playlist_items" ON playlist_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_items.playlist_id AND playlists.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_playlist_items" ON playlist_items;
CREATE POLICY "insert_own_playlist_items" ON playlist_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_items.playlist_id AND playlists.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_playlist_items" ON playlist_items;
CREATE POLICY "update_own_playlist_items" ON playlist_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_items.playlist_id AND playlists.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_items.playlist_id AND playlists.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_playlist_items" ON playlist_items;
CREATE POLICY "delete_own_playlist_items" ON playlist_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_items.playlist_id AND playlists.user_id = auth.uid())
  );

-- Liked Videos
CREATE TABLE IF NOT EXISTS liked_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  title text NOT NULL,
  author text,
  author_id text,
  thumbnail text,
  length_seconds integer,
  liked_at timestamptz DEFAULT now(),
  UNIQUE (user_id, video_id)
);
ALTER TABLE liked_videos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_liked_user_liked ON liked_videos(user_id, liked_at DESC);
CREATE INDEX IF NOT EXISTS idx_liked_user_video ON liked_videos(user_id, video_id);

DROP POLICY IF EXISTS "select_own_liked" ON liked_videos;
CREATE POLICY "select_own_liked" ON liked_videos FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_liked" ON liked_videos;
CREATE POLICY "insert_own_liked" ON liked_videos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_liked" ON liked_videos;
CREATE POLICY "update_own_liked" ON liked_videos FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_liked" ON liked_videos;
CREATE POLICY "delete_own_liked" ON liked_videos FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Watch Later
CREATE TABLE IF NOT EXISTS watch_later (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  title text NOT NULL,
  author text,
  author_id text,
  thumbnail text,
  length_seconds integer,
  added_at timestamptz DEFAULT now(),
  UNIQUE (user_id, video_id)
);
ALTER TABLE watch_later ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_watchlater_user_added ON watch_later(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlater_user_video ON watch_later(user_id, video_id);

DROP POLICY IF EXISTS "select_own_watchlater" ON watch_later;
CREATE POLICY "select_own_watchlater" ON watch_later FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_watchlater" ON watch_later;
CREATE POLICY "insert_own_watchlater" ON watch_later FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_watchlater" ON watch_later;
CREATE POLICY "update_own_watchlater" ON watch_later FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_watchlater" ON watch_later;
CREATE POLICY "delete_own_watchlater" ON watch_later FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Preferences (single row per user)
CREATE TABLE IF NOT EXISTS preferences (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  autoplay boolean DEFAULT true,
  default_quality text DEFAULT 'auto',
  theme text DEFAULT 'dark',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_preferences" ON preferences;
CREATE POLICY "select_own_preferences" ON preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_preferences" ON preferences;
CREATE POLICY "insert_own_preferences" ON preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_preferences" ON preferences;
CREATE POLICY "update_own_preferences" ON preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_preferences" ON preferences;
CREATE POLICY "delete_own_preferences" ON preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);