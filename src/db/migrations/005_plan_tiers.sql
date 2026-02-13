-- Add agent and ultra plan tiers
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'agent', 'ultra'));

-- Update Vince to ultra (founder)
UPDATE profiles SET plan = 'ultra' WHERE email = 'vince.tropicalbliss@gmail.com';
