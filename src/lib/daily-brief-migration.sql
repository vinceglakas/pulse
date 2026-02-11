-- Add daily brief columns
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS is_daily boolean DEFAULT false;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS daily_date date;
CREATE INDEX IF NOT EXISTS idx_briefs_daily ON briefs (is_daily, daily_date DESC) WHERE is_daily = true;
