-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
CREATE TABLE IF NOT EXISTS saved_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brief_id uuid NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, brief_id)
);
