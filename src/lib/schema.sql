-- Pulse: Briefs table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS briefs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  topic text NOT NULL,
  brief_text text NOT NULL,
  sources jsonb DEFAULT '[]',
  raw_data jsonb DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read briefs
CREATE POLICY "Anyone can read briefs" ON briefs
  FOR SELECT USING (true);

-- Allow service role to insert briefs
CREATE POLICY "Service role can insert" ON briefs
  FOR INSERT WITH CHECK (true);
