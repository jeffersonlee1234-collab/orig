-- ==========================================================
-- Database Schema for Social Service Management System
-- ==========================================================

-- 1. Activity Log Table
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  actor VARCHAR(255) NOT NULL,
  actor_role VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  reference_no VARCHAR(100),
  subject VARCHAR(255),
  detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_deleted_at ON activity_log(deleted_at);

-- 2. AICS Applications Table
CREATE TABLE IF NOT EXISTS aics_applications (
  id SERIAL PRIMARY KEY,
  reference_no VARCHAR(100) UNIQUE NOT NULL,
  assistance_type VARCHAR(150) NOT NULL,
  qc_id VARCHAR(100),
  first_name VARCHAR(150) NOT NULL,
  middle_name VARCHAR(150),
  last_name VARCHAR(150) NOT NULL,
  suffix VARCHAR(50),
  nationality VARCHAR(100),
  birth_date VARCHAR(50),
  age INTEGER,
  gender VARCHAR(50),
  civil_status VARCHAR(50),
  phone VARCHAR(50),
  email VARCHAR(150),
  address TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aics_reference_no ON aics_applications(reference_no);
CREATE INDEX IF NOT EXISTS idx_aics_status ON aics_applications(status);
CREATE INDEX IF NOT EXISTS idx_aics_qc_id ON aics_applications(qc_id);

-- 3. AICS Documents Table
CREATE TABLE IF NOT EXISTS aics_documents (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES aics_applications(id) ON DELETE CASCADE,
  document_label VARCHAR(255),
  original_filename VARCHAR(255),
  file_type VARCHAR(100),
  file_data BYTEA,
  file_path TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aics_documents_app_id ON aics_documents(application_id);

-- 4. Solo Parent Applications Table
CREATE TABLE IF NOT EXISTS solo_parent_applications (
  id SERIAL PRIMARY KEY,
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  application_status VARCHAR(50) DEFAULT 'draft',
  application_type VARCHAR(50) NOT NULL, -- 'new', 'renewal', 'loss'
  is_resident BOOLEAN DEFAULT true,

  -- For New Application:
  classification_id VARCHAR(100),
  classification_title VARCHAR(255),

  -- For Renewal & Lost ID:
  solo_parent_id_number VARCHAR(100),
  is_id_verified BOOLEAN DEFAULT false,

  -- Personal Information (New, Renewal, Lost ID):
  first_name VARCHAR(150),
  middle_name VARCHAR(150),
  last_name VARCHAR(150),
  suffix VARCHAR(50),
  age INTEGER,
  sex VARCHAR(50),
  civil_status VARCHAR(100),
  dob_month VARCHAR(50),
  dob_day VARCHAR(50),
  dob_year VARCHAR(50),
  contact_no VARCHAR(50),
  address_house_no VARCHAR(100),
  address_street VARCHAR(255),
  address_barangay VARCHAR(255),
  address_city_municipality VARCHAR(255),
  qcid_number VARCHAR(100),
  email VARCHAR(150),

  -- Documents & Workflow:
  required_document_ids JSONB DEFAULT '[]'::jsonb,
  uploaded_documents JSONB DEFAULT '[]'::jsonb,
  rejection_reason TEXT,
  admin_notes TEXT,
  approved_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solo_parent_user_id ON solo_parent_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_solo_parent_reference ON solo_parent_applications(reference_number);
CREATE INDEX IF NOT EXISTS idx_solo_parent_status ON solo_parent_applications(application_status);

-- 5. Child Welfare Applications Table
CREATE TABLE IF NOT EXISTS child_welfare_applications (
  id SERIAL PRIMARY KEY,
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  application_status VARCHAR(50) DEFAULT 'draft',
  category_id VARCHAR(100),
  category_title VARCHAR(255),
  required_document_ids JSONB DEFAULT '[]'::jsonb,
  uploaded_documents JSONB DEFAULT '[]'::jsonb,
  guardian_first_name VARCHAR(150),
  guardian_middle_name VARCHAR(150),
  guardian_last_name VARCHAR(150),
  guardian_sex VARCHAR(50),
  guardian_date_of_birth VARCHAR(50),
  guardian_age INTEGER,
  guardian_civil_status VARCHAR(50),
  guardian_relationship_to_child VARCHAR(100),
  guardian_contact_no VARCHAR(50),
  guardian_email VARCHAR(150),
  guardian_valid_id VARCHAR(100),
  address_house_no VARCHAR(100),
  address_street VARCHAR(255),
  address_barangay VARCHAR(255),
  address_city_municipality VARCHAR(255),
  child_name VARCHAR(255),
  child_sex VARCHAR(50),
  child_birthday VARCHAR(50),
  child_age INTEGER,
  child_school_daycare VARCHAR(255),
  child_birth_certificate VARCHAR(255),
  child_grade_level VARCHAR(100),
  child_school_address TEXT,
  child_enrollment_status VARCHAR(100),
  child_special_needs VARCHAR(100),
  child_special_needs_specify TEXT,
  household_members VARCHAR(50),
  children_studying VARCHAR(50),
  monthly_household_income VARCHAR(100),
  main_source_income VARCHAR(255),
  employment_status VARCHAR(100),
  other_financial_support TEXT,
  support_types JSONB DEFAULT '[]'::jsonb,
  support_other TEXT,
  primary_reason_for_assistance TEXT,
  specific_needs TEXT,
  estimated_amount_needed VARCHAR(100),
  urgency VARCHAR(50),
  child_living_arrangement VARCHAR(100),
  other_children_needing_assistance VARCHAR(50),
  other_children_count VARCHAR(50),
  other_govt_assistance_received VARCHAR(50),
  other_govt_program TEXT,
  additional_info TEXT,
  rejection_reason TEXT,
  admin_notes TEXT,
  approved_by VARCHAR(100),
  approved_amount VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_welfare_user_id ON child_welfare_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_child_welfare_reference ON child_welfare_applications(reference_number);
CREATE INDEX IF NOT EXISTS idx_child_welfare_status ON child_welfare_applications(application_status);

-- 6. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  reference_no VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  applicant_name VARCHAR(255) NOT NULL,
  concern VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'scheduled', 'completed'
  scheduled_date VARCHAR(100),
  scheduled_time VARCHAR(100),
  office_location VARCHAR(255) DEFAULT 'Quezon City Hall',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_ref ON appointments(reference_no);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- 7. Financial Aid Disbursements Table
CREATE TABLE IF NOT EXISTS financial_aid_disbursements (
  id SERIAL PRIMARY KEY,
  disbursement_id VARCHAR(100) UNIQUE NOT NULL,
  application_ref VARCHAR(100) NOT NULL,
  applicant_name VARCHAR(255) NOT NULL,
  assistance_type VARCHAR(150) NOT NULL,
  fixed_amount NUMERIC(12, 2) NOT NULL,
  date_approved VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'RELEASED'
  appointment_date VARCHAR(100),
  appointment_time VARCHAR(100),
  venue VARCHAR(255) DEFAULT 'Quezon City Hall',
  released_date VARCHAR(100),
  released_by VARCHAR(255),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disb_id ON financial_aid_disbursements(disbursement_id);
CREATE INDEX IF NOT EXISTS idx_disb_ref ON financial_aid_disbursements(application_ref);
CREATE INDEX IF NOT EXISTS idx_disb_status ON financial_aid_disbursements(status);

-- 8. User Notifications Table
CREATE TABLE IF NOT EXISTS user_notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  application_ref VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifs_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifs_read ON user_notifications(is_read);

-- 9. Livelihood Applications Table
CREATE TABLE IF NOT EXISTS livelihood_applications (
  id SERIAL PRIMARY KEY,
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  application_status VARCHAR(50) DEFAULT 'under_review', -- 'pending', 'under_review', 'approved', 'rejected', 'needs_revision'
  
  -- Applicant Information
  qcid VARCHAR(100),
  first_name VARCHAR(150) NOT NULL,
  middle_name VARCHAR(150),
  last_name VARCHAR(150) NOT NULL,
  suffix VARCHAR(50),
  nationality VARCHAR(100) DEFAULT 'Filipino',
  date_of_birth VARCHAR(100),
  age INTEGER,
  gender VARCHAR(50),
  civil_status VARCHAR(100),
  house_building_no VARCHAR(100),
  street_name VARCHAR(255),
  barangay VARCHAR(255),
  phone_number VARCHAR(50),
  email VARCHAR(150),
  
  -- Livelihood Details
  livelihood_type VARCHAR(150) NOT NULL,
  livelihood_status VARCHAR(50) NOT NULL, -- 'New Livelihood', 'Existing Livelihood'
  business_description TEXT NOT NULL,
  business_location TEXT NOT NULL,
  same_as_registered_address BOOLEAN DEFAULT false,
  
  -- Assistance & Requirements
  assistance_needed JSONB DEFAULT '[]'::jsonb,
  estimated_amount NUMERIC(12, 2) DEFAULT 0,
  reason_purpose TEXT NOT NULL,
  uploaded_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Workflow / Review
  rejection_reason TEXT,
  revision_notes TEXT,
  admin_notes TEXT,
  approved_by VARCHAR(100),
  approved_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livelihood_ref ON livelihood_applications(reference_number);
CREATE INDEX IF NOT EXISTS idx_livelihood_user ON livelihood_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_livelihood_status ON livelihood_applications(application_status);

-- 10. Capital / Materials Assistance Table
CREATE TABLE IF NOT EXISTS livelihood_assistance (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES livelihood_applications(id) ON DELETE CASCADE,
  reference_number VARCHAR(100) NOT NULL,
  assistance_status VARCHAR(50) DEFAULT 'for_processing', -- 'for_processing', 'for_release', 'released'
  approved_financial_amount NUMERIC(12, 2) DEFAULT 0,
  approved_materials JSONB DEFAULT '[]'::jsonb,
  approved_equipment JSONB DEFAULT '[]'::jsonb,
  release_date VARCHAR(100),
  release_time VARCHAR(100),
  release_location VARCHAR(255) DEFAULT 'Quezon City Hall - SSDD Livelihood Center',
  instructions TEXT,
  released_at TIMESTAMP WITH TIME ZONE,
  released_by VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livelihood_assist_app ON livelihood_assistance(application_id);
CREATE INDEX IF NOT EXISTS idx_livelihood_assist_ref ON livelihood_assistance(reference_number);

-- 11. Livelihood Monitoring Table
CREATE TABLE IF NOT EXISTS livelihood_monitoring (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES livelihood_applications(id) ON DELETE CASCADE,
  reference_number VARCHAR(100) NOT NULL,
  monitoring_status VARCHAR(50) DEFAULT 'active', -- 'active', 'ongoing', 'needs_follow_up', 'completed'
  log_type VARCHAR(50) DEFAULT 'inspection', -- 'resident_update', 'inspection', 'follow_up'
  title VARCHAR(255),
  notes TEXT,
  monthly_sales_range VARCHAR(100),
  challenges_needs TEXT,
  officer_name VARCHAR(150),
  photos JSONB DEFAULT '[]'::jsonb,
  inspection_date VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livelihood_mon_app ON livelihood_monitoring(application_id);
CREATE INDEX IF NOT EXISTS idx_livelihood_mon_ref ON livelihood_monitoring(reference_number);

-- 12. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  middle_name VARCHAR(100),
  suffix VARCHAR(50),
  birth_date VARCHAR(50),
  city VARCHAR(100),
  barangay VARCHAR(150),
  street VARCHAR(255),
  house_no VARCHAR(100),
  working_in_qc VARCHAR(10),
  occupation VARCHAR(150),
  sex VARCHAR(20),
  mobile_number VARCHAR(50),
  profile_photo_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  is_email_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 13. Email OTPs Table
CREATE TABLE IF NOT EXISTS email_otps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  otp_code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);

-- 14. PWD & Senior Citizen Applications Table
CREATE TABLE IF NOT EXISTS pwd_senior_applications (
  id VARCHAR(100) PRIMARY KEY,
  reference_number VARCHAR(100),
  category VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  suffix VARCHAR(20),
  date_of_birth VARCHAR(50),
  age VARCHAR(10),
  sex VARCHAR(20),
  civil_status VARCHAR(50),
  contact_no VARCHAR(50),
  email VARCHAR(150),
  address TEXT,
  disability_type VARCHAR(100),
  disability_class VARCHAR(50),
  cause_of_disability VARCHAR(100),
  applying_for VARCHAR(50) DEFAULT 'myself',
  documents JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_id_number VARCHAR(100),
  approved_by VARCHAR(100),
  approved_date VARCHAR(50),
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pwd_senior_ref ON pwd_senior_applications(reference_number);
CREATE INDEX IF NOT EXISTS idx_pwd_senior_cat ON pwd_senior_applications(category);
CREATE INDEX IF NOT EXISTS idx_pwd_senior_status ON pwd_senior_applications(status);

-- 15. Beneficiaries Table (1:1 with Users / Citizens)
CREATE TABLE IF NOT EXISTS beneficiaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  beneficiary_number VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  suffix VARCHAR(50),
  age VARCHAR(20),
  sex VARCHAR(50),
  civil_status VARCHAR(100),
  birth_date VARCHAR(50),
  address TEXT,
  contact_no VARCHAR(50),
  email VARCHAR(150),
  qcid_number VARCHAR(100),
  household_members VARCHAR(50) DEFAULT '1',
  verification_status VARCHAR(50) DEFAULT 'pending', -- 'verified', 'pending', 'unverified'
  verification_date TIMESTAMP WITH TIME ZONE,
  verified_by VARCHAR(150),
  verification_remarks TEXT,
  id_type VARCHAR(100),
  id_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_num ON beneficiaries(beneficiary_number);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_qcid ON beneficiaries(qcid_number);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_email ON beneficiaries(email);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_status ON beneficiaries(verification_status);

-- 16. Beneficiary Verification Audit Table (1:M with Beneficiaries)
CREATE TABLE IF NOT EXISTS beneficiary_verifications (
  id SERIAL PRIMARY KEY,
  beneficiary_id INTEGER REFERENCES beneficiaries(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL, -- 'verified', 'unverified', 'pending'
  reviewed_by VARCHAR(150) NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ben_verif_ben_id ON beneficiary_verifications(beneficiary_id);

-- 17. Beneficiary History & Activity Log (1:M with Beneficiaries)
CREATE TABLE IF NOT EXISTS beneficiary_history (
  id SERIAL PRIMARY KEY,
  beneficiary_id INTEGER REFERENCES beneficiaries(id) ON DELETE CASCADE,
  application_id VARCHAR(100),
  program VARCHAR(100) NOT NULL, -- 'AICS', 'PWD', 'Senior Citizen', 'Solo Parent', 'Child Welfare', 'Livelihood', 'Training', 'System'
  action VARCHAR(150) NOT NULL,
  performed_by VARCHAR(150) NOT NULL,
  status VARCHAR(50),
  detail TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ben_history_ben_id ON beneficiary_history(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_ben_history_created_at ON beneficiary_history(created_at DESC);

-- 18. Training Applications Table
CREATE TABLE IF NOT EXISTS training_applications (
  id SERIAL PRIMARY KEY,
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  qcid VARCHAR(100),
  user_id VARCHAR(100),
  training_id VARCHAR(100) NOT NULL,
  training_name VARCHAR(255) NOT NULL,
  applicant_info JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_revision'
  schedule JSONB DEFAULT '{}'::jsonb,
  attendance JSONB DEFAULT '{}'::jsonb,
  certificate JSONB DEFAULT NULL,
  approved_by VARCHAR(150),
  approved_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  revision_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_ref ON training_applications(reference_number);
CREATE INDEX IF NOT EXISTS idx_training_qcid ON training_applications(qcid);
CREATE INDEX IF NOT EXISTS idx_training_status ON training_applications(status);
