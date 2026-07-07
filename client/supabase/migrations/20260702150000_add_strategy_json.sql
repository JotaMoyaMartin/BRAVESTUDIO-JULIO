-- Add strategy_json column to store the full 13-section strategic document
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS strategy_json JSONB;