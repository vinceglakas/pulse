-- Accounts pipeline tables
-- Run against your Supabase project

-- 1. accounts
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  state text,
  website text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_status ON accounts(user_id, status);

-- 2. account_contacts
CREATE TABLE IF NOT EXISTS account_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  email text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_contacts_account ON account_contacts(account_id);

-- 3. account_activities
CREATE TABLE IF NOT EXISTS account_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  summary text NOT NULL,
  outcome text,
  follow_up_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_activities_account ON account_activities(account_id);
CREATE INDEX idx_account_activities_followup ON account_activities(user_id, follow_up_date);

-- 4. account_research
CREATE TABLE IF NOT EXISTS account_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_research_account ON account_research(account_id);

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own accounts" ON accounts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own contacts" ON account_contacts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own activities" ON account_activities
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own research" ON account_research
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. account_updates (overnight monitoring)
CREATE TABLE IF NOT EXISTS account_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  summary text NOT NULL,
  source_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_updates_account ON account_updates(account_id);
CREATE INDEX idx_account_updates_unread ON account_updates(user_id, is_read, created_at DESC);

ALTER TABLE account_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own updates" ON account_updates
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_accounts_updated_at();
