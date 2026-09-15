const fs = require('fs');
const path = require('path');
const db = require('./db');
const bcrypt = require('bcryptjs');

async function initDb() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.warn('⚠️ schema.sql not found at:', schemaPath);
      return;
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await db.query(schemaSql);

    // Migration patches for solo_parent_applications (Solo Parent + Child Welfare Consolidated)
    await db.query(`
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS module_type VARCHAR(50) DEFAULT 'SOLO_PARENT';
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
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS applicant_photo TEXT;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS family_members JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;
      
      -- Child Welfare Consolidated Fields
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS category_id VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS category_title VARCHAR(255);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_first_name VARCHAR(150);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_middle_name VARCHAR(150);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_last_name VARCHAR(150);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_sex VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_date_of_birth VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_age INTEGER;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_civil_status VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_relationship_to_child VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_contact_no VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(150);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS guardian_valid_id VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_name VARCHAR(255);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_sex VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_birthday VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_age INTEGER;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_school_daycare VARCHAR(255);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_birth_certificate VARCHAR(255);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_grade_level VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_school_address TEXT;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_enrollment_status VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_special_needs VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_special_needs_specify TEXT;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS household_members VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS children_studying VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS monthly_household_income VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS main_source_income VARCHAR(255);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS employment_status VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS other_financial_support TEXT;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS support_types JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS support_other TEXT;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS primary_reason_for_assistance TEXT;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS specific_needs TEXT;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS estimated_amount_needed VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS urgency VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS child_living_arrangement VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS other_children_needing_assistance VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS other_children_count VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS other_govt_assistance_received VARCHAR(50);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS other_govt_program TEXT;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS additional_info TEXT;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS approved_amount VARCHAR(100);
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

      CREATE INDEX IF NOT EXISTS idx_solo_parent_type ON solo_parent_applications(application_type);
      CREATE INDEX IF NOT EXISTS idx_solo_parent_id_num ON solo_parent_applications(solo_parent_id_number);
      CREATE INDEX IF NOT EXISTS idx_solo_parent_assigned_id ON solo_parent_applications(assigned_id_number);
      CREATE INDEX IF NOT EXISTS idx_solo_parent_module ON solo_parent_applications(module_type);
    `);

    // Check and migrate legacy child_welfare_applications into solo_parent_applications, then DROP child_welfare_applications
    try {
      const checkLegacyTable = await db.query(`
        SELECT to_regclass('public.child_welfare_applications') as tbl;
      `);
      if (checkLegacyTable.rows[0] && checkLegacyTable.rows[0].tbl) {
        console.log('🔄 Migrating legacy child_welfare_applications into solo_parent_applications...');
        await db.query(`
          INSERT INTO solo_parent_applications (
            reference_number, user_id, module_type, application_status,
            category_id, category_title, required_document_ids, uploaded_documents,
            guardian_first_name, guardian_middle_name, guardian_last_name, guardian_sex,
            guardian_date_of_birth, guardian_age, guardian_civil_status,
            guardian_relationship_to_child, guardian_contact_no, guardian_email, guardian_valid_id,
            address_house_no, address_street, address_barangay, address_city_municipality,
            child_name, child_sex, child_birthday, child_age, child_school_daycare,
            child_birth_certificate, child_grade_level, child_school_address,
            child_enrollment_status, child_special_needs, child_special_needs_specify,
            household_members, children_studying, monthly_household_income, main_source_income,
            employment_status, other_financial_support, support_types, support_other,
            primary_reason_for_assistance, specific_needs, estimated_amount_needed, urgency,
            child_living_arrangement, other_children_needing_assistance, other_children_count,
            other_govt_assistance_received, other_govt_program, additional_info,
            rejection_reason, admin_notes, approved_by, approved_amount, is_archived, archived_at,
            created_at, updated_at
          )
          SELECT 
            reference_number, user_id, 'CHILD_WELFARE', COALESCE(application_status, 'draft'),
            category_id, category_title, COALESCE(required_document_ids, '[]'::jsonb), COALESCE(uploaded_documents, '[]'::jsonb),
            guardian_first_name, guardian_middle_name, guardian_last_name, guardian_sex,
            guardian_date_of_birth, guardian_age, guardian_civil_status,
            guardian_relationship_to_child, guardian_contact_no, guardian_email, guardian_valid_id,
            address_house_no, address_street, address_barangay, address_city_municipality,
            child_name, child_sex, child_birthday, child_age, child_school_daycare,
            child_birth_certificate, child_grade_level, child_school_address,
            child_enrollment_status, child_special_needs, child_special_needs_specify,
            household_members, children_studying, monthly_household_income, main_source_income,
            employment_status, other_financial_support, COALESCE(support_types, '[]'::jsonb), support_other,
            primary_reason_for_assistance, specific_needs, estimated_amount_needed, urgency,
            child_living_arrangement, other_children_needing_assistance, other_children_count,
            other_govt_assistance_received, other_govt_program, additional_info,
            rejection_reason, admin_notes, approved_by, approved_amount, COALESCE(is_archived, false), archived_at,
            created_at, updated_at
          FROM child_welfare_applications
          ON CONFLICT (reference_number) DO UPDATE SET
            module_type = 'CHILD_WELFARE';

          DROP TABLE IF EXISTS child_welfare_applications CASCADE;
        `);
        console.log('✅ Successfully consolidated child_welfare_applications and dropped legacy table.');
      }
    } catch (migErr) {
      console.warn('⚠️ Table consolidation notice:', migErr.message);
    }

    // Migration patches for livelihood_applications (Workflow, Revision, & Approval Columns)
    await db.query(`
      ALTER TABLE livelihood_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE livelihood_applications ADD COLUMN IF NOT EXISTS revision_notes TEXT;
      ALTER TABLE livelihood_applications ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE livelihood_applications ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
      ALTER TABLE livelihood_applications ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP WITH TIME ZONE;
      ALTER TABLE livelihood_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      CREATE TABLE IF NOT EXISTS livelihood_assistance (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES livelihood_applications(id) ON DELETE CASCADE,
        reference_number VARCHAR(100) NOT NULL,
        assistance_status VARCHAR(50) DEFAULT 'for_processing',
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

      CREATE TABLE IF NOT EXISTS livelihood_monitoring (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES livelihood_applications(id) ON DELETE CASCADE,
        reference_number VARCHAR(100) NOT NULL,
        monitoring_status VARCHAR(50) DEFAULT 'active',
        log_type VARCHAR(50) DEFAULT 'inspection',
        title VARCHAR(255),
        notes TEXT,
        monthly_sales_range VARCHAR(100),
        challenges_needs TEXT,
        officer_name VARCHAR(150),
        inspection_date VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS email_otps (
        id SERIAL PRIMARY KEY,
        email VARCHAR(150) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_used BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS qcid_number VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_month VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_day VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_token VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_type VARCHAR(20);

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);

      CREATE TABLE IF NOT EXISTS user_login_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        email VARCHAR(150) NOT NULL,
        session_token VARCHAR(255) NOT NULL,
        device_type VARCHAR(50) DEFAULT 'Desktop (PC)',
        device_name VARCHAR(150) DEFAULT 'Windows PC • Chrome',
        browser VARCHAR(100) DEFAULT 'Chrome',
        os VARCHAR(100) DEFAULT 'Windows',
        ip_address VARCHAR(100) DEFAULT '127.0.0.1',
        location VARCHAR(150) DEFAULT 'Quezon City, PH',
        is_active BOOLEAN DEFAULT true,
        login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        logout_at TIMESTAMP WITH TIME ZONE,
        logout_reason VARCHAR(150)
      );

      CREATE INDEX IF NOT EXISTS idx_login_sessions_email ON user_login_sessions(email);
      CREATE INDEX IF NOT EXISTS idx_login_sessions_token ON user_login_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_login_sessions_active ON user_login_sessions(is_active);

      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        attempt_count INTEGER DEFAULT 1,
        first_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_attempt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        locked_until TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON login_attempts(ip_address, email);

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
    `);

    // 1. Auto-migrate any existing unhashed plain-text passwords in DB to bcrypt
    try {
      const plainUsers = await db.query("SELECT id, email, password FROM users WHERE password IS NOT NULL AND password NOT LIKE '$2%'");
      if (plainUsers && plainUsers.rows && plainUsers.rows.length > 0) {
        console.log(`🔐 [Init DB] Found ${plainUsers.rows.length} unhashed user password(s). Upgrading to bcrypt...`);
        for (const row of plainUsers.rows) {
          if (row.password) {
            const hashed = bcrypt.hashSync(row.password, 12);
            await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, row.id]);
          }
        }
        console.log(`✅ [Init DB] Successfully upgraded ${plainUsers.rows.length} password(s) to bcrypt.`);
      }
    } catch (e) {
      console.warn('⚠️ [Init DB] Plaintext password auto-hash note:', e.message);
    }

    // 2. Seed and migrate administrator account strictly to admin@quezoncity.gov.ph
    const adminHashed = bcrypt.hashSync('Admin123!', 12);
    const defaultHashed = bcrypt.hashSync('default123', 10);

    // Update any old 'admin' email to 'admin@quezoncity.gov.ph'
    try {
      const existingAdminCheck = await db.query("SELECT id FROM users WHERE LOWER(email) = 'admin@quezoncity.gov.ph'");
      if (existingAdminCheck.rows.length === 0) {
        // If no admin@quezoncity.gov.ph exists yet, rename 'admin' directly
        await db.query(`
          UPDATE users 
          SET email = 'admin@quezoncity.gov.ph',
              password = '${adminHashed}',
              role = 'admin',
              status = 'active',
              first_name = 'System',
              last_name = 'Administrator',
              is_email_verified = true
          WHERE LOWER(email) = 'admin'
        `);
      } else {
        // If admin@quezoncity.gov.ph already exists, delete old 'admin' record
        await db.query("DELETE FROM users WHERE LOWER(email) = 'admin'");
      }
    } catch (e) {
      console.warn('⚠️ [Init DB] Admin rename note:', e.message);
    }

    await db.query(`
      INSERT INTO users (email, password, first_name, last_name, role, status, is_email_verified, qcid_number)
      VALUES 
        ('admin@quezoncity.gov.ph', '${adminHashed}', 'System', 'Administrator', 'admin', 'active', true, '110000116932100')
      ON CONFLICT (email) DO UPDATE SET password = '${adminHashed}', role = 'admin', status = 'active';

      -- Auto-sync existing module applicants into users table
      INSERT INTO users (email, password, first_name, last_name, middle_name, suffix, mobile_number, qcid_number, role, status, is_email_verified, created_at)
      SELECT DISTINCT ON (LOWER(email))
        LOWER(email), '${defaultHashed}', first_name, last_name, middle_name, suffix, phone, qc_id, 'user', 'active', true, created_at
      FROM aics_applications
      WHERE email IS NOT NULL AND email != '' AND LOWER(email) NOT IN (SELECT LOWER(email) FROM users)
      ON CONFLICT (email) DO NOTHING;

      INSERT INTO users (email, password, first_name, last_name, middle_name, suffix, mobile_number, qcid_number, role, status, is_email_verified, created_at)
      SELECT DISTINCT ON (LOWER(email))
        LOWER(email), '${defaultHashed}', first_name, last_name, middle_name, suffix, contact_no, COALESCE(assigned_id_number, reference_number), 'user', 'active', true, submitted_at
      FROM pwd_senior_applications
      WHERE email IS NOT NULL AND email != '' AND LOWER(email) NOT IN (SELECT LOWER(email) FROM users)
      ON CONFLICT (email) DO NOTHING;

      INSERT INTO users (email, password, first_name, last_name, middle_name, suffix, mobile_number, qcid_number, role, status, is_email_verified, created_at)
      SELECT DISTINCT ON (LOWER(email))
        LOWER(email), '${defaultHashed}', first_name, last_name, middle_name, suffix, contact_no, COALESCE(solo_parent_id_number, qcid_number), 'user', 'active', true, created_at
      FROM solo_parent_applications
      WHERE email IS NOT NULL AND email != '' AND LOWER(email) NOT IN (SELECT LOWER(email) FROM users)
      ON CONFLICT (email) DO NOTHING;

      INSERT INTO users (email, password, first_name, last_name, middle_name, mobile_number, role, status, is_email_verified, created_at)
      SELECT DISTINCT ON (LOWER(guardian_email))
        LOWER(guardian_email), '${defaultHashed}', guardian_first_name, guardian_last_name, guardian_middle_name, guardian_contact_no, 'user', 'active', true, created_at
      FROM solo_parent_applications
      WHERE module_type = 'CHILD_WELFARE' AND guardian_email IS NOT NULL AND guardian_email != '' AND LOWER(guardian_email) NOT IN (SELECT LOWER(email) FROM users)
      ON CONFLICT (email) DO NOTHING;

      INSERT INTO users (email, password, first_name, last_name, mobile_number, qcid_number, role, status, is_email_verified, created_at)
      SELECT DISTINCT ON (LOWER(email))
        LOWER(email), '${defaultHashed}', first_name, last_name, contact_no, qcid_no, 'user', 'active', true, created_at
      FROM livelihood_applications
      WHERE email IS NOT NULL AND email != '' AND LOWER(email) NOT IN (SELECT LOWER(email) FROM users)
      ON CONFLICT (email) DO NOTHING;
    `);

    await db.query(`
      -- Archive column support for all application categories
      ALTER TABLE aics_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE aics_applications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS emergency_first_name VARCHAR(100);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS emergency_last_name VARCHAR(100);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS emergency_contact_person VARCHAR(200);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS emergency_contact_no VARCHAR(50);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS emergency_relationship VARCHAR(100);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS emergency_address TEXT;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS emergency_residential_address TEXT;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS house_no VARCHAR(100);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS street VARCHAR(150);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS barangay VARCHAR(100);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS blood_type VARCHAR(20);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS existing_id_number VARCHAR(100);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS reason_for_renewal TEXT;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS reason_for_replacement TEXT;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;

      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
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

      ALTER TABLE livelihood_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE livelihood_applications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

      ALTER TABLE training_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE training_applications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

      CREATE TABLE IF NOT EXISTS archived_applications (
        id SERIAL PRIMARY KEY,
        application_id VARCHAR(100),
        reference_no VARCHAR(100),
        category VARCHAR(100),
        assistance_title VARCHAR(255),
        applicant_name VARCHAR(255),
        email VARCHAR(150),
        qcid VARCHAR(100),
        status VARCHAR(50),
        payload JSONB DEFAULT '{}'::jsonb,
        archived_by VARCHAR(150),
        reason TEXT,
        archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Case Management Integration Tables
      CREATE TABLE IF NOT EXISTS case_records (
        id SERIAL PRIMARY KEY,
        case_number VARCHAR(100) UNIQUE NOT NULL,
        application_ref VARCHAR(100) NOT NULL,
        program VARCHAR(100) NOT NULL,
        beneficiary_qcid VARCHAR(100),
        beneficiary_name VARCHAR(255),
        case_type VARCHAR(255),
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'medium',
        assigned_social_worker VARCHAR(150) DEFAULT 'Admin Social Worker',
        date_opened TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        notes TEXT,
        closed_at TIMESTAMP WITH TIME ZONE,
        closed_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS case_referrals (
        id SERIAL PRIMARY KEY,
        case_number VARCHAR(100) NOT NULL,
        application_ref VARCHAR(100) NOT NULL,
        referred_to VARCHAR(255) NOT NULL,
        service_reason TEXT NOT NULL,
        referred_by VARCHAR(150) DEFAULT 'Admin Social Worker',
        referral_date VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS case_monitoring (
        id SERIAL PRIMARY KEY,
        case_number VARCHAR(100) NOT NULL,
        application_ref VARCHAR(100) NOT NULL,
        officer_name VARCHAR(150) DEFAULT 'Admin Social Worker',
        monitoring_date VARCHAR(100) NOT NULL,
        notes TEXT NOT NULL,
        progress_status VARCHAR(100) DEFAULT 'In Progress',
        next_action TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_case_records_ref ON case_records(application_ref);
      CREATE INDEX IF NOT EXISTS idx_case_referrals_case ON case_referrals(case_number);
      CREATE INDEX IF NOT EXISTS idx_case_monitoring_case ON case_monitoring(case_number);

      -- Beneficiary Management Tables
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
        verification_status VARCHAR(50) DEFAULT 'pending',
        verification_date TIMESTAMP WITH TIME ZONE,
        verified_by VARCHAR(150),
        verification_remarks TEXT,
        id_type VARCHAR(100),
        id_number VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS beneficiary_verifications (
        id SERIAL PRIMARY KEY,
        beneficiary_id INTEGER REFERENCES beneficiaries(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        reviewed_by VARCHAR(150) NOT NULL,
        reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        reason TEXT,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS beneficiary_history (
        id SERIAL PRIMARY KEY,
        beneficiary_id INTEGER REFERENCES beneficiaries(id) ON DELETE CASCADE,
        application_id VARCHAR(100),
        program VARCHAR(100) NOT NULL,
        action VARCHAR(150) NOT NULL,
        performed_by VARCHAR(150) NOT NULL,
        status VARCHAR(50),
        detail TEXT,
        remarks TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries(user_id);
      CREATE INDEX IF NOT EXISTS idx_beneficiaries_num ON beneficiaries(beneficiary_number);
      CREATE INDEX IF NOT EXISTS idx_beneficiaries_qcid ON beneficiaries(qcid_number);
      CREATE INDEX IF NOT EXISTS idx_ben_verif_ben_id ON beneficiary_verifications(beneficiary_id);
      CREATE INDEX IF NOT EXISTS idx_ben_history_ben_id ON beneficiary_history(beneficiary_id);

      -- Clean up dummy mock records
      DELETE FROM beneficiaries 
      WHERE full_name IN ('Clarisa Mae Dimal', 'Rosalinda Torres', 'Julius Cabrera', 'Emilyn Salazar', 'Ferdinand Villanueva', 'Bryan Aguilar')
         OR beneficiary_number IN ('BNF-2026-0001', 'BNF-2026-0002', 'BNF-2026-0003', 'BNF-2026-0004');

      -- Training Applications Table
      CREATE TABLE IF NOT EXISTS training_applications (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(100) UNIQUE NOT NULL,
        qcid VARCHAR(100),
        user_id VARCHAR(100),
        training_id VARCHAR(100) NOT NULL,
        training_name VARCHAR(255) NOT NULL,
        applicant_info JSONB DEFAULT '{}'::jsonb,
        status VARCHAR(50) DEFAULT 'pending',
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

      -- Notifications Tables
      CREATE TABLE IF NOT EXISTS user_notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        is_dismissed BOOLEAN DEFAULT false,
        application_ref VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
      ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
      ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT false;
      ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS application_ref VARCHAR(100);
      ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      CREATE TABLE IF NOT EXISTS user_notification_state (
        id SERIAL PRIMARY KEY,
        user_identifier VARCHAR(150) NOT NULL,
        notif_id VARCHAR(255) NOT NULL,
        is_read BOOLEAN DEFAULT false,
        is_dismissed BOOLEAN DEFAULT false,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE user_notification_state ADD COLUMN IF NOT EXISTS user_identifier VARCHAR(150);
      ALTER TABLE user_notification_state ADD COLUMN IF NOT EXISTS notif_id VARCHAR(255);
      ALTER TABLE user_notification_state ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
      ALTER TABLE user_notification_state ADD COLUMN IF NOT EXISTS is_dismissed BOOLEAN DEFAULT false;
      ALTER TABLE user_notification_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notif_state_user_notif ON user_notification_state(user_identifier, notif_id);

      -- High-Performance Indexes for Query Speed Optimization
      CREATE INDEX IF NOT EXISTS idx_users_qcid ON users(qcid_number);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_pwd_senior_qcid ON pwd_senior_applications(qcid);
      CREATE INDEX IF NOT EXISTS idx_pwd_senior_status ON pwd_senior_applications(status);
      CREATE INDEX IF NOT EXISTS idx_pwd_senior_ref ON pwd_senior_applications(reference_number);
      CREATE INDEX IF NOT EXISTS idx_pwd_senior_user_id ON pwd_senior_applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_aics_qcid ON aics_applications(qcid_number);
      CREATE INDEX IF NOT EXISTS idx_aics_status ON aics_applications(status);
      CREATE INDEX IF NOT EXISTS idx_aics_user_id ON aics_applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_solo_parent_qcid ON solo_parent_applications(qcid_number);
      CREATE INDEX IF NOT EXISTS idx_solo_parent_status ON solo_parent_applications(application_status);
      CREATE INDEX IF NOT EXISTS idx_solo_parent_module ON solo_parent_applications(module_type);
      CREATE INDEX IF NOT EXISTS idx_livelihood_status ON livelihood_applications(application_status);
      CREATE INDEX IF NOT EXISTS idx_training_status ON training_applications(status);
      CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
      CREATE INDEX IF NOT EXISTS idx_beneficiaries_qcid ON beneficiaries(qcid_number);
      CREATE INDEX IF NOT EXISTS idx_user_notif_qcid ON user_notifications(qcid_number);
      CREATE INDEX IF NOT EXISTS idx_user_notif_user ON user_notifications(user_id);
    `);

    // Seed / Ensure strictly 1 official Administrator account in DB
    try {
      const adminPassHash = await bcrypt.hash('Admin123!', 12);
      const adminEmail = 'admin@quezoncity.gov.ph';

      const adminCheck = await db.query('SELECT id, password FROM users WHERE LOWER(email) = $1', [adminEmail]);
      if (adminCheck.rows.length === 0) {
        await db.query(
          `INSERT INTO users (
            email, password, first_name, last_name, middle_name, suffix,
            city, barangay, street, house_no, working_in_qc, occupation, sex,
            mobile_number, qcid_number, role, status, is_email_verified, created_at, updated_at
          ) VALUES (
            $1, $2, 'System', 'Administrator', '', '',
            'QUEZON CITY', 'Central', 'Elliptical Road', 'QC Hall', 'Yes', 'System Administrator', 'MALE',
            '09171234567', '110000116932100', 'admin', 'active', true, NOW(), NOW()
          )`,
          [adminEmail, adminPassHash]
        );
        console.log('[DB] Seeded official administrator account: admin@quezoncity.gov.ph');
      } else {
        await db.query(
          `UPDATE users SET role = 'admin', status = 'active', password = $1 WHERE LOWER(email) = $2`,
          [adminPassHash, adminEmail]
        );
      }
    } catch (adminSeedErr) {
      console.warn('[DB] Warning during admin account seed:', adminSeedErr.message);
    }

    console.log('✅ PostgreSQL database tables, indexes, and official admin account verified/initialized successfully.');
  } catch (err) {
    console.warn('⚠️ Note during database auto-init:', err.message);
  }
}

module.exports = initDb;
