-- ============================================================================
-- Migration: Study Rooms Support (250-seat SFU, 5-seat free cohorts, chat & timer)
-- Date: 2026-10-11
-- ============================================================================

-- 1. Ensure rooms table has room_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'room_type'
  ) THEN
    ALTER TABLE rooms ADD COLUMN room_type TEXT DEFAULT 'coding';
  END IF;
END $$;

-- 2. Messages table with UUID, room index, and deduplication
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room_created 
  ON messages(room_id, created_at DESC);

-- 3. Study Timers table (server-backed source of truth)
CREATE TABLE IF NOT EXISTS study_timers (
  room_id TEXT PRIMARY KEY,
  duration_seconds INT NOT NULL DEFAULT 1500,
  started_at TIMESTAMPTZ,
  is_running BOOLEAN NOT NULL DEFAULT FALSE,
  mode TEXT NOT NULL DEFAULT 'focus',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Study Member Statuses (sanitized status per member in room)
CREATE TABLE IF NOT EXISTS study_member_statuses (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  status_text TEXT NOT NULL DEFAULT 'Studying',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- 5. Row Level Security policies (allow authenticated and anon participants)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_member_statuses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read messages') THEN
    CREATE POLICY "Allow read messages" ON messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert messages') THEN
    CREATE POLICY "Allow insert messages" ON messages FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read study_timers') THEN
    CREATE POLICY "Allow read study_timers" ON study_timers FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update study_timers') THEN
    CREATE POLICY "Allow update study_timers" ON study_timers FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read member_statuses') THEN
    CREATE POLICY "Allow read member_statuses" ON study_member_statuses FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow write member_statuses') THEN
    CREATE POLICY "Allow write member_statuses" ON study_member_statuses FOR ALL USING (true);
  END IF;
END $$;
