-- Pulse Database Schema
-- Run this in the NEW Pulse Supabase project (not SLIQ!)

-- Briefs table (stores research results)
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

-- Anyone can read briefs (shareable links)
CREATE POLICY "Anyone can read briefs" ON briefs
  FOR SELECT USING (true);

-- Service role can insert (API route)
CREATE POLICY "Service role can insert briefs" ON briefs
  FOR INSERT WITH CHECK (true);

-- Users can see their own briefs
CREATE POLICY "Users can see own briefs" ON briefs
  FOR SELECT USING (auth.uid() = user_id);

-- Search usage tracking (for free tier limits)
CREATE TABLE IF NOT EXISTS search_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  ip_address text,
  topic text NOT NULL,
  brief_id uuid REFERENCES briefs(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE search_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own usage" ON search_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage" ON search_usage
  FOR INSERT WITH CHECK (true);

-- Index for counting monthly usage per user/IP
CREATE INDEX idx_search_usage_user_month ON search_usage (user_id, created_at);
CREATE INDEX idx_search_usage_ip_month ON search_usage (ip_address, created_at);

-- Profiles (extended user info)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text,
  full_name text,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
  searches_this_month int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage profiles" ON profiles
  FOR ALL USING (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
