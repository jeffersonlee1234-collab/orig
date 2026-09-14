-- PostgreSQL Migration Script for Solo Parent Applications
-- Aligned with the 3 official flows:
-- 1. New Application (New Solo Parent ID)
-- 2. Renewal of Solo Parent ID
-- 3. Replacement / Lost Solo Parent ID

-- Step 1: Ensure required columns exist in solo_parent_applications
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS solo_parent_id_number VARCHAR(100);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS assigned_id_number VARCHAR(100);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS is_id_verified BOOLEAN DEFAULT false;
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS civil_status VARCHAR(100);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS qcid_number VARCHAR(100);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS email VARCHAR(150);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_first_name VARCHAR(100);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_last_name VARCHAR(100);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_name VARCHAR(200);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_contact_no VARCHAR(50);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_relationship VARCHAR(100);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_address TEXT;
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS blood_type VARCHAR(20);
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS family_members JSONB DEFAULT '[]'::jsonb;
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;

-- Step 2: Ensure application_type column is present and properly indexed
ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS application_type VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_solo_parent_type ON solo_parent_applications(application_type);
CREATE INDEX IF NOT EXISTS idx_solo_parent_id_num ON solo_parent_applications(solo_parent_id_number);
CREATE INDEX IF NOT EXISTS idx_solo_parent_user_id ON solo_parent_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_solo_parent_reference ON solo_parent_applications(reference_number);
CREATE INDEX IF NOT EXISTS idx_solo_parent_status ON solo_parent_applications(application_status);
