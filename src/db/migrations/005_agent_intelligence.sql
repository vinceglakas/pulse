-- =============================================
-- ULTRON SERVERLESS: Full Agent Intelligence Layer
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Fix plan tiers (add agent + ultra)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'agent', 'ultra'));
UPDATE profiles SET plan = 'ultra' WHERE email = 'vince.tropicalbliss@gmail.com';

-- 2. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 3. User memory (vector-enabled semantic search)
CREATE TABLE IF NOT EXISTS user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('preference', 'fact', 'pattern', 'skill', 'lesson', 'general', 'contact', 'goal')),
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_memory_user ON user_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memory_category ON user_memory(user_id, category);
-- Vector index for semantic search
CREATE INDEX IF NOT EXISTS idx_user_memory_embedding ON user_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE user_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own memory" ON user_memory FOR ALL USING (auth.uid() = user_id);

-- 4. User skills (agent-created patterns)
CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_conditions TEXT,
  process TEXT,
  success_criteria TEXT,
  use_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own skills" ON user_skills FOR ALL USING (auth.uid() = user_id);

-- 5. Scheduled tasks (per-user proactive intelligence)
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  schedule TEXT NOT NULL, -- 'daily-9am', 'weekly-monday-9am', 'every-4h', cron expression
  task_prompt TEXT NOT NULL,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  last_result TEXT,
  enabled BOOLEAN DEFAULT true,
  delivery TEXT DEFAULT 'in_app' CHECK (delivery IN ('in_app', 'telegram', 'discord', 'email')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_user ON scheduled_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_next_run ON scheduled_tasks(next_run) WHERE enabled = true;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tasks" ON scheduled_tasks FOR ALL USING (auth.uid() = user_id);

-- 6. Agent notifications queue
CREATE TABLE IF NOT EXISTS agent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'alert', 'reminder', 'insight', 'task_result')),
  read BOOLEAN DEFAULT false,
  source TEXT, -- 'scheduled_task', 'proactive', 'agent'
  source_id UUID, -- reference to scheduled_task or artifact
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON agent_notifications(user_id, read);
ALTER TABLE agent_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON agent_notifications FOR ALL USING (auth.uid() = user_id);

-- 7. Vector similarity search function
CREATE OR REPLACE FUNCTION match_user_memory(
  query_embedding VECTOR(1536),
  match_user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  category TEXT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.id,
    um.content,
    um.category,
    1 - (um.embedding <=> query_embedding) AS similarity,
    um.created_at
  FROM user_memory um
  WHERE um.user_id = match_user_id
    AND 1 - (um.embedding <=> query_embedding) > match_threshold
  ORDER BY um.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 8. Add soul_prompt to profiles (per-user evolving personality)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS soul_prompt TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_personality JSONB DEFAULT '{}';
