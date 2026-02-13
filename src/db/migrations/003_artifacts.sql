CREATE TABLE IF NOT EXISTS artifacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('table', 'kanban', 'list', 'document', 'chart')),
  icon TEXT,
  description TEXT,
  schema JSONB NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '[]',
  group_by TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own artifacts" ON artifacts
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_artifacts_user_id ON artifacts(user_id);
