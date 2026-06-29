-- Claymate Database Setup
-- Run this in Supabase SQL Editor to create the games table and enable realtime sync

-- 1. Create the games table
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_code TEXT UNIQUE,
  game_name TEXT NOT NULL UNIQUE,
  squad JSONB NOT NULL,
  num_stations INTEGER NOT NULL DEFAULT 8,
  scores JSONB NOT NULL DEFAULT '{}',
  active_station INTEGER,
  active_shooter TEXT,
  active_shot_index INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Realtime (required for postgres_changes subscriptions)
ALTER TABLE games REPLICA IDENTITY FULL;

-- 3. Add Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- 4. Create policies (allow full access to anonymous users via anon key)
CREATE POLICY "Allow anon select" ON games FOR SELECT USING (true);
CREATE POLICY "Allow anon insert" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON games FOR UPDATE USING (true);
CREATE POLICY "Allow anon delete" ON games FOR DELETE USING (true);

-- 5. Create index for faster game_code lookups
CREATE INDEX IF NOT EXISTS games_game_code_idx ON games(game_code);

-- 6. Enable the games table for Realtime publication
-- (Go to Supabase Dashboard → Database → Replication → Source → enable the "games" table)
-- OR run:
-- PUBLICATION supabase_realtime ADD TABLE games;
