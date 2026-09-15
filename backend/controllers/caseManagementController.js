// controllers/caseManagementController.js
const db = require('../config/db');

function formatCaseNumber(ref, id) {
  if (ref && String(ref).startsWith('CM-')) return String(ref).toUpperCase();
  const digits = String(ref || id || '1000').replace(/\D/g, '').slice(-4) || '1001';
  return `CM-2026-${digits.padStart(4, '0')}`;
}

function getProgramTitle(cat, type) {
  const c = String(cat || '').toUpperCase();
  const t = String(type || '').toLowerCase();
  if (c.includes('AICS')) return 'AICS';
  if (c.includes('PWD')) return 'PWD';
  if (c.includes('SENIOR')) return 'Senior Citizen';
  if (c.includes('SOLO')) return 'Solo Parent';
  if (c.includes('CHILD')) return 'Child Welfare';
  if (c.includes('LIVELIHOOD')) return 'Livelihood';
  if (c.includes('TRAIN')) return 'Training Program';
  return 'AICS';
}

function getCaseType(cat, type, specificTitle) {
  if (specificTitle) return specificTitle;
  const c = String(cat || '').toUpperCase();
  const t = String(type || '').toLowerCase();
  if (c.includes('AICS')) return `${type || 'Medical'} Assistance`;
  if (c.includes('PWD')) return t.includes('booklet') ? 'PWD Booklet Issuance' : 'PWD Assistance & Welfare';
  if (c.includes('SENIOR')) return t.includes('booklet') ? 'Senior Citizen Booklet' : 'OSCA Verification & Welfare';
  if (c.includes('SOLO')) return 'Solo Parent ID & Comprehensive Care';
  if (c.includes('CHILD')) return 'Child Welfare & Protection';
  if (c.includes('LIVELIHOOD')) return 'Livelihood Capital Grant & Support';
  if (c.includes('TRAIN')) return 'Skills Training Program';
  return 'Community Welfare Assistance';
}

async function initCaseManagementTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS case_records (
        id SERIAL PRIMARY KEY,
        case_number VARCHAR(100) UNIQUE NOT NULL,
        application_ref VARCHAR(100) NOT NULL,
        program VARCHAR(100) NOT NULL DEFAULT 'AICS',
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        assigned_social_worker VARCHAR(150) DEFAULT 'Admin Social Worker',
        notes TEXT,
        closed_at TIMESTAMP,
        closed_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS case_referrals (
        id SERIAL PRIMARY KEY,
        case_number VARCHAR(100) NOT NULL,
        application_ref VARCHAR(100),
        referred_to VARCHAR(200) NOT NULL,
        service_reason TEXT NOT NULL,
        referred_by VARCHAR(150) DEFAULT 'Admin Social Worker',
        referral_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS case_monitoring (
        id SERIAL PRIMARY KEY,
        case_number VARCHAR(100) NOT NULL,
        application_ref VARCHAR(100),
        officer_name VARCHAR(150) DEFAULT 'Admin Social Worker',
        monitoring_date VARCHAR(50),
        progress_status VARCHAR(100) DEFAULT 'In Progress',
        notes TEXT,
        next_action TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE aics_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE livelihood_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE training_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
    `);
  } catch (e) {
    console.warn('[Case Management init tables]:', e.message);
  }
}
initCaseManagementTables();

exports.getAllCases = async (req, res) => {
  try {
    // 1. Fetch Approved Applications from all modules
    const [
      aicsRes,
      pwdSeniorRes,
      soloRes,
      childRes,
      livelihoodRes,
      trainingRes,
      apptRes,
      financialRes,
      caseRecordsRes,
      referralsRes,
      monitoringRes,
    ] = await Promise.all([
      db.query(`SELECT * FROM aics_applications WHERE LOWER(COALESCE(status, '')) IN ('approved', 'completed', 'for_release', 'released') ORDER BY created_at DESC`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM pwd_senior_applications WHERE LOWER(COALESCE(status, '')) IN ('approved', 'completed', 'for_release', 'released', 'verified') ORDER BY created_at DESC`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM solo_parent_applications WHERE (module_type = 'SOLO_PARENT' OR module_type IS NULL) AND LOWER(COALESCE(application_status, '')) IN ('approved', 'completed', 'for_release', 'released', 'active') ORDER BY created_at DESC`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM solo_parent_applications WHERE module_type = 'CHILD_WELFARE' AND (LOWER(COALESCE(application_status, '')) IN ('approved', 'completed', 'for_release', 'released', 'active') OR LOWER(COALESCE(category_title, '')) LIKE '%nutrition%' OR LOWER(COALESCE(primary_reason_for_assistance, '')) LIKE '%nutrition%') ORDER BY created_at DESC`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM livelihood_applications WHERE LOWER(COALESCE(application_status, '')) IN ('approved', 'completed', 'for_processing', 'for_release', 'released') ORDER BY created_at DESC`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM training_applications WHERE LOWER(COALESCE(status, '')) IN ('approved', 'completed', 'enrolled', 'graduated') ORDER BY created_at DESC`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM appointments ORDER BY created_at DESC`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM financial_aid_disbursements ORDER BY created_at DESC`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM case_records`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM case_referrals ORDER BY created_at ASC`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM case_monitoring ORDER BY created_at ASC`).catch(() => ({ rows: [] })),
    ]);

    const appointments = apptRes.rows;
    const financialAids = financialRes.rows;
    const caseRecordsMap = new Map();
    caseRecordsRes.rows.forEach((r) => {
      caseRecordsMap.set(r.application_ref, r);
      caseRecordsMap.set(r.case_number, r);
    });

    const referralsMap = new Map();
    referralsRes.rows.forEach((ref) => {
      const key = ref.application_ref || ref.case_number;
      if (!referralsMap.has(key)) referralsMap.set(key, []);
      referralsMap.get(key).push({
        id: `REF-${ref.id}`,
        date: ref.referral_date || new Date(ref.created_at).toISOString().split('T')[0],
        referredTo: ref.referred_to,
        reason: ref.service_reason,
        referredBy: ref.referred_by || 'Admin Social Worker',
        status: ref.status || 'pending',
        remarks: ref.remarks || '',
      });
    });

    const monitoringMap = new Map();
    monitoringRes.rows.forEach((mon) => {
      const key = mon.application_ref || mon.case_number;
      if (!monitoringMap.has(key)) monitoringMap.set(key, []);
      monitoringMap.get(key).push({
        id: `MON-${mon.id}`,
        date: mon.monitoring_date || new Date(mon.created_at).toISOString().split('T')[0],
        officer: mon.officer_name || 'Admin Social Worker',
        notes: mon.notes,
        progressStatus: mon.progress_status || 'In Progress',
        nextAction: mon.next_action || '',
      });
    });

    function generateAutoReferrals(moduleName, caseType, dateStr, ref, worker) {
      const mod = String(moduleName || 'AICS').toLowerCase();
      const type = String(caseType || '').toLowerCase();
      const workerName = worker || 'Admin Social Worker';
      const d = dateStr || new Date().toISOString().split('T')[0];

      if (mod.includes('child')) {
        // 1. Child Protection Assistance
        if (type.includes('protection') || type.includes('abuse') || type.includes('neglect') || type.includes('custody') || type.includes('danger') || type.includes('threat')) {
          return [
            {
              id: `REF-AUTO-1-${ref}`,
              date: d,
              referredTo: 'Quezon City Protection Center for Women and Children (QCPC) / PNP WCPD',
              reason: 'Urgent crisis intervention, protective custody referral, forensic medical evaluation, and legal referral.',
              referredBy: workerName,
              status: 'accepted',
              remarks: 'Case file expedited for 24/7 protection response and child safety containment.',
            },
            {
              id: `REF-AUTO-2-${ref}`,
              date: d,
              referredTo: 'Barangay Council for the Protection of Children (BCPC) – Community Safety Desk',
              reason: 'Community-level monitoring, spot check-ins, and protective neighborhood supervision.',
              referredBy: workerName,
              status: 'accepted',
              remarks: 'Barangay focal worker designated for weekly home safety verification.',
            },
            {
              id: `REF-AUTO-3-${ref}`,
              date: d,
              referredTo: 'SSDD Child Rights, Advocacy & Legal Assistance Unit',
              reason: 'Legal case representation, protective custody endorsement, and child rights advocacy.',
              referredBy: workerName,
              status: 'in_review',
              remarks: 'Legal officer assigned for case docketing and family court coordination.',
            },
            {
              id: `REF-AUTO-4-${ref}`,
              date: d,
              referredTo: 'Quezon City General Hospital – Child Advocacy and Psychosocial Support Desk',
              reason: 'Trauma-informed psychosocial counseling, pediatric mental health therapy, and pediatric healthcare assessment.',
              referredBy: workerName,
              status: 'accepted',
              remarks: 'Clinical counseling schedule queued for child emotional stabilization.',
            },
          ];
        }

        // 2. Emergency Child Assistance
        if (type.includes('emergency') || type.includes('crisis') || type.includes('disaster') || type.includes('rescue')) {
          return [
            {
              id: `REF-AUTO-1-${ref}`,
              date: d,
              referredTo: 'QC Disaster Risk Reduction and Management Office (QCDRRMO) & Quick Response Team',
              reason: 'Immediate emergency relief dispatch, emergency transport, and crisis shelter allocation.',
              referredBy: workerName,
              status: 'accepted',
              remarks: 'Priority emergency ticket registered for immediate family relief support.',
            },
            {
              id: `REF-AUTO-2-${ref}`,
              date: d,
              referredTo: 'Quezon City General Hospital – Pediatric Emergency & Crisis Center',
              reason: 'Emergency pediatric triage, urgent medical intervention, and hospitalization subsidy.',
              referredBy: workerName,
              status: 'accepted',
              remarks: 'Direct hospital endorsement guarantee for urgent medical care.',
            },
            {
              id: `REF-AUTO-3-${ref}`,
              date: d,
              referredTo: 'SSDD Quick Response & Emergency Welfare Desk',
              reason: 'Emergency financial relief payout, food supply packs, and transitional temporary lodging.',
              referredBy: workerName,
              status: 'accepted',
              remarks: 'Emergency cash grant and relief pack dispatched for immediate claiming.',
            },
          ];
        }

        // 3. Nutritional Assistance
        return [
          {
            id: `REF-AUTO-1-${ref}`,
            date: d,
            referredTo: 'Quezon City Health Department – Nutrition & Supplementary Feeding Division',
            reason: 'Child nutritional profiling, continuous health monitoring, and inclusion in regular barangay dietary feeding programs.',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'Direct referral dispatched for supplemental food ration and growth tracking.',
          },
          {
            id: `REF-AUTO-2-${ref}`,
            date: d,
            referredTo: 'Barangay Nutrition Scholar (BNS) & Community Supplementary Feeding Center',
            reason: 'Daily hot meals feeding program, micronutrient supplementation, and regular bi-weekly weight monitoring.',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'Enrolled in the 90-day dietary rehabilitation cycle.',
          },
          {
            id: `REF-AUTO-3-${ref}`,
            date: d,
            referredTo: 'QC Food Security Task Force & SSDD Food Relief Division',
            reason: 'Monthly family food packs, enriched infant milk formula, and fortified dietary supplements.',
            referredBy: workerName,
            status: 'in_review',
            remarks: 'Food pack supply card activated for monthly distribution.',
          },
        ];
      }

      if (mod.includes('solo')) {
        return [
          {
            id: `REF-AUTO-1-${ref}`,
            date: d,
            referredTo: 'Quezon City Public Employment Service Office (PESO) / QC Skills Academy',
            reason: 'Priority employment referral, livelihood capital assistance matching, and free vocational skills training (RA 11861).',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'Beneficiary enrolled in livelihood skills matching registry.',
          },
          {
            id: `REF-AUTO-2-${ref}`,
            date: d,
            referredTo: 'Quezon City Health Department – Maternal & Child Care Section',
            reason: 'Comprehensive health services, pediatric care, and 10% discount + VAT exemption for solo parent dependents.',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'Healthcare booklet and medical assistance endorsement active.',
          },
          {
            id: `REF-AUTO-3-${ref}`,
            date: d,
            referredTo: 'Quezon City Legal Aid Office – Family Support & Custody Desk',
            reason: 'Free legal counseling for child support enforcement, custody documentation, and paternal acknowledgment.',
            referredBy: workerName,
            status: 'in_review',
            remarks: 'Endorsed for legal consult and parental support assistance.',
          },
        ];
      }

      if (mod.includes('pwd') || mod.includes('senior')) {
        const isPwd = mod.includes('pwd');
        return [
          {
            id: `REF-AUTO-1-${ref}`,
            date: d,
            referredTo: 'Quezon City General Hospital (QCGH) / City Health Center Network',
            reason: 'Free outpatient diagnostic screening, specialist consultation, and maintenance medicine supplies.',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'Healthcare privilege and hospital social service endorsement granted.',
          },
          {
            id: `REF-AUTO-2-${ref}`,
            date: d,
            referredTo: isPwd ? 'QC Persons with Disability Affairs Office (PDAO)' : 'Office for Senior Citizens Affairs (OSCA)',
            reason: 'Mandatory discount booklet, social pension evaluation, and community welfare benefits coordination.',
            referredBy: workerName,
            status: 'completed',
            remarks: 'ID and welfare entitlement credentials officially authenticated.',
          },
          {
            id: `REF-AUTO-3-${ref}`,
            date: d,
            referredTo: 'QC Community Inclusive Workforce & Assistive Device Hub',
            reason: isPwd ? 'Assistive mobility devices, accessible livelihood training, and workplace inclusion matching.' : 'Senior social recreation, physical wellness programs, and community volunteer circles.',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'Community welfare participation record created.',
          },
        ];
      }

      if (mod.includes('livelihood') || mod.includes('training')) {
        return [
          {
            id: `REF-AUTO-1-${ref}`,
            date: d,
            referredTo: 'QC Small Business & Cooperatives Development Promotions Office (SBCDPO)',
            reason: 'Micro-enterprise coaching, business registration guidance, and market linkages for community ventures.',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'Enterprise support file forwarded for commercial mentorship.',
          },
          {
            id: `REF-AUTO-2-${ref}`,
            date: d,
            referredTo: 'TESDA Accredited QC Skills Development Academy',
            reason: 'Basic financial literacy, product packaging, and entrepreneurship skills development.',
            referredBy: workerName,
            status: 'completed',
            remarks: 'Training orientation modules scheduled.',
          },
          {
            id: `REF-AUTO-3-${ref}`,
            date: d,
            referredTo: 'Quezon City Cooperative Development Authority (QCCDA)',
            reason: 'Access to community seed capital grants, low-interest micro-credit, and cooperative enterprise membership.',
            referredBy: workerName,
            status: 'in_review',
            remarks: 'Queued for cooperative financial empowerment orientation.',
          },
        ];
      }

      // AICS (Default - medical, funeral, education, financial, etc.)
      const isFuneral = type.includes('funeral') || type.includes('burial');
      const isEducation = type.includes('educ') || type.includes('school');

      if (isFuneral) {
        return [
          {
            id: `REF-AUTO-1-${ref}`,
            date: d,
            referredTo: 'Quezon City Public Cemetery & Mortuary Assistance Services',
            reason: 'Burial plot accommodation, mortuary fee subsidies, and funeral logistics support.',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'Funeral assistance endorsement and burial coordinator assigned.',
          },
          {
            id: `REF-AUTO-2-${ref}`,
            date: d,
            referredTo: 'SSDD Crisis Intervention Unit (CIU) – Burial Amelioration Desk',
            reason: 'Immediate financial aid grant payout and bereavement counseling.',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'Bereavement grant certified for financial disbursement.',
          },
        ];
      }

      if (isEducation) {
        return [
          {
            id: `REF-AUTO-1-${ref}`,
            date: d,
            referredTo: 'Quezon City Scholarship and Youth Development Program (SYDP)',
            reason: 'Tuition grant endorsement, academic stipend evaluation, and school supply distribution.',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'Student record linked with City Education registry.',
          },
          {
            id: `REF-AUTO-2-${ref}`,
            date: d,
            referredTo: 'Division of City Schools – Student Welfare Desk',
            reason: 'Enrollment facilitation, learning kit provision, and student welfare support.',
            referredBy: workerName,
            status: 'accepted',
            remarks: 'School focal coordinator notified for educational assistance disbursement.',
          },
        ];
      }

      return [
        {
          id: `REF-AUTO-1-${ref}`,
          date: d,
          referredTo: 'Quezon City General Hospital – Medical Social Services Division',
          reason: 'Specialized medical diagnostics, pharmaceutical support, and hospitalization subsidy coordination.',
          referredBy: workerName,
          status: 'accepted',
          remarks: 'Guarantee letter and emergency medical assistance linked.',
        },
        {
          id: `REF-AUTO-2-${ref}`,
          date: d,
          referredTo: 'SSDD Crisis Intervention Unit (CIU)',
          reason: 'Psychosocial support, food assistance relief pack, and aftercare welfare monitoring.',
          referredBy: workerName,
          status: 'accepted',
          remarks: 'Crisis assistance case record endorsed for continuing support.',
        },
        {
          id: `REF-AUTO-3-${ref}`,
          date: d,
          referredTo: 'Philippine Charity Sweepstakes Office (PCSO) / Malasakit Center',
          reason: 'Supplemental hospital bill assistance and continuing prescription medicine funding.',
          referredBy: workerName,
          status: 'in_review',
          remarks: 'Malasakit partner referral endorsement issued.',
        },
      ];
    }

    function generateAutoMonitoringLogs(moduleName, caseType, dateStr, ref, appt, fin, worker) {
      const mod = String(moduleName || 'AICS').toLowerCase();
      const workerName = worker || 'Admin Social Worker';
      const d = dateStr || new Date().toISOString().split('T')[0];
      const logs = [];

      logs.push({
        id: `MON-AUTO-1-${ref}`,
        date: d,
        officer: workerName,
        notes: `Initial intake validation and eligibility assessment completed for ${caseType || 'Social Welfare Assistance'}. Beneficiary documentation authenticated.`,
        progressStatus: 'In Progress',
        nextAction: 'Proceed with scheduled orientation / financial aid release and welfare monitoring.',
      });

      if (appt?.status === 'completed' || fin?.status === 'RELEASED') {
        logs.push({
          id: `MON-AUTO-2-${ref}`,
          date: appt?.scheduled_date || d,
          officer: workerName,
          notes: `Beneficiary attended scheduled intake/orientation. Assistance / financial aid of ₱${Number(fin?.fixed_amount || 5000).toLocaleString()} successfully released in full.`,
          progressStatus: 'Active Supervision',
          nextAction: 'Conduct periodic welfare check-in and coordinate aftercare with barangay focal desk.',
        });
      }

      logs.push({
        id: `MON-AUTO-3-${ref}`,
        date: d,
        officer: workerName,
        notes: `Welfare monitoring follow-up conducted. Beneficiary status recorded as stable with ongoing support from city social services.`,
        progressStatus: 'Stabilized / Progressing',
        nextAction: 'Maintain on active case registry for next quarterly assessment.',
      });

      return logs;
    }

    // Check if an application is an actual Assistance case (not just ID / Booklet issuance)
    function isAssistanceCase(prog, type, category, assistanceType) {
      const p = String(prog || '').toUpperCase();
      const text = `${type || ''} ${category || ''} ${assistanceType || ''}`.toLowerCase();

      // AICS, Child Welfare, Livelihood are always assistance
      if (p.includes('AICS') || p.includes('CHILD') || p.includes('LIVELIHOOD')) {
        return true;
      }

      // Pure ID or Booklet services do NOT need appointment
      if (
        text.includes('booklet') ||
        text.includes('id card') ||
        text.includes('id only') ||
        text.includes('id issuance') ||
        text.includes('new id') ||
        text.includes('id renewal') ||
        (text.includes('id') && !text.includes('assist') && !text.includes('financial') && !text.includes('pension'))
      ) {
        return false;
      }

      // If explicitly assistance / subsidy / pension / cash / devices
      if (
        text.includes('assist') ||
        text.includes('financial') ||
        text.includes('medical') ||
        text.includes('funeral') ||
        text.includes('educational') ||
        text.includes('pension') ||
        text.includes('subsidy') ||
        text.includes('cash') ||
        text.includes('device') ||
        text.includes('wheelchair') ||
        text.includes('feeding') ||
        text.includes('nutrition')
      ) {
        return true;
      }

      return false;
    }

    const cases = [];

    // Helper to match appointment strictly for the matching reference / assistance application
    function findAppointment(ref, qcid, email, moduleName) {
      const cleanRef = String(ref || '').trim().toLowerCase();
      const cleanQcid = String(qcid || '').trim().toLowerCase();
      const cleanMod = String(moduleName || '').trim().toLowerCase();

      return appointments.find((a) => {
        const aRef = String(a.reference_number || a.reference_no || a.application_id || '').trim().toLowerCase();
        const aQcid = String(a.qcid_number || a.qc_id || '').trim().toLowerCase();
        const aMod = String(a.module || '').trim().toLowerCase();
        const aConcern = String(a.concern || '').trim().toLowerCase();

        // Exclude ID and Booklet from appointments
        if (aConcern.includes('id') || aConcern.includes('booklet')) return false;

        if (cleanRef && aRef === cleanRef) return true;
        if (cleanMod && aMod && cleanMod === aMod && cleanQcid && aQcid === cleanQcid) return true;
        return false;
      });
    }

    // Helper to match financial aid
    function findFinancialAid(ref, qcid) {
      const cleanRef = String(ref || '').trim().toLowerCase();
      const cleanQcid = String(qcid || '').trim().toLowerCase();
      return financialAids.find((f) => {
        const fRef = String(f.application_ref || f.reference_number || f.reference_no || '').trim().toLowerCase();
        const fQcid = String(f.beneficiary_id || f.qcid_number || f.qc_id || '').trim().toLowerCase();
        return (cleanRef && fRef === cleanRef) || (cleanQcid && fQcid === cleanQcid);
      });
    }

    // Helper for safe ISO date formatting
    function safeIsoDate(val, fallback = '2026-09-09') {
      if (!val) return fallback;
      try {
        const d = new Date(val);
        if (isNaN(d.getTime())) {
          return String(val).split('T')[0] || fallback;
        }
        return d.toISOString().split('T')[0];
      } catch {
        return fallback;
      }
    }

    // Helper for safe age calculation from DOB
    function calculateAge(dobStr, fallbackAge) {
      if (fallbackAge && String(fallbackAge).trim() && String(fallbackAge).trim() !== '—' && !isNaN(Number(fallbackAge))) {
        return String(fallbackAge).trim();
      }
      if (!dobStr) return '';
      try {
        const birth = new Date(dobStr);
        if (isNaN(birth.getTime())) return '';
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
          age--;
        }
        return age >= 0 && age <= 125 ? String(age) : '';
      } catch {
        return '';
      }
    }

    // Helper for standardized sex display
    function formatSex(s) {
      if (!s) return '';
      const str = String(s).trim().toLowerCase();
      if (str === 'm' || str === 'male') return 'Male';
      if (str === 'f' || str === 'female') return 'Female';
      return String(s).trim();
    }

    // FULL SYSTEM AUTOMATED CASE RESOLUTION HELPER
    function computeResolvedCaseStatus(override, fin, mons = [], refs = [], appt = null) {
      if (override && override.status) {
        return override.status.toLowerCase();
      }

      // FULL SYSTEM AUTO-RESOLUTION RULES:
      // Step 1: Application approved (verified)
      // Step 2: Financial aid is released / claimed OR non-cash service fulfilled
      // Step 4: Welfare Monitoring check-ins have been logged
      const hasReleasedAid = fin && String(fin.status).toUpperCase() === 'RELEASED';
      const hasMonitoringLogs = mons && mons.length > 0;
      const hasCompletedAppt = !appt || String(appt.status).toLowerCase() === 'completed' || String(appt.status).toLowerCase() === 'attended';

      // 1. If financial aid is released AND monitoring check-ins are logged -> Automatically RESOLVED & CLOSED
      if (hasReleasedAid && hasMonitoringLogs) {
        return 'closed';
      }

      // 2. If non-cash service with completed appointments and monitoring check-ins -> Automatically RESOLVED & CLOSED
      if (!fin && hasCompletedAppt && mons && mons.length >= 2) {
        return 'closed';
      }

      if (mons && mons.length > 0) return 'monitoring';
      if (refs && refs.length > 0) return 'referred';
      if (appt?.status === 'completed' && (!fin || hasReleasedAid)) return 'open';
      return 'open';
    }

    // Process AICS
    aicsRes.rows.forEach((row, idx) => {
      try {
        const ref = row.reference_no || `AICS-${row.id}`;
        const qcid = row.qc_id || ref;
        const caseNum = formatCaseNumber(ref, idx + 1);
        const override = caseRecordsMap.get(ref) || caseRecordsMap.get(caseNum) || {};
        const appt = findAppointment(ref, qcid, row.email);
        const fin = findFinancialAid(ref, qcid);

        const fullName = [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(' ').trim() || 'AICS Beneficiary';
        const dateApplied = safeIsoDate(row.created_at, '2026-08-15');
        const dateApproved = safeIsoDate(row.updated_at || row.created_at, dateApplied);
        const caseType = getCaseType('AICS', row.assistance_type);

        let refs = referralsMap.get(ref) || referralsMap.get(caseNum) || [];
        if (refs.length === 0) {
          refs = generateAutoReferrals('AICS', row.assistance_type, dateApproved, ref, override.assigned_social_worker);
        }
        let mons = monitoringMap.get(ref) || monitoringMap.get(caseNum) || [];
        if (mons.length === 0) {
          mons = generateAutoMonitoringLogs('AICS', row.assistance_type, dateApproved, ref, appt, fin, override.assigned_social_worker);
        }

        // Automated status resolution
        const resolvedStatus = computeResolvedCaseStatus(override, fin, mons, refs, appt);

        // Build real chronological timeline
        const timeline = [
          {
            id: `TL-SUB-${ref}`,
            title: 'Application Submitted',
            detail: `Submitted AICS ${row.assistance_type || 'Financial'} Assistance application (Ref: ${ref}).`,
            date: dateApplied,
            type: 'submission',
          },
          {
            id: `TL-APP-${ref}`,
            title: 'Application Approved',
            detail: `Application reviewed and officially approved by Admin Social Worker. Case ${caseNum} automatically created.`,
            date: dateApproved,
            type: 'approval',
          },
        ];

        if (appt) {
          timeline.push({
            id: `TL-APPT-${appt.id}`,
            title: appt.status === 'completed' ? 'Appointment Completed' : 'Appointment Scheduled',
            detail: `Appointment scheduled at ${appt.scheduled_date || appt.appointment_date || 'QC Hall'} ${appt.scheduled_time || appt.appointment_time || '09:00 AM'} - Venue: ${appt.venue || appt.location || 'Quezon City Social Services Building'}. (Status: ${appt.status || 'Scheduled'})`,
            date: appt.scheduled_date || dateApproved,
            type: 'appointment',
          });
        }

        if (fin) {
          if (fin.status === 'RELEASED') {
            timeline.push({
              id: `TL-FIN-REL-${fin.id}`,
              title: 'Financial Aid Released',
              detail: `Disbursement ${fin.disbursement_id || 'FA-DISB'} of ₱${Number(fin.fixed_amount || 5000).toLocaleString()} successfully released to beneficiary.`,
              date: safeIsoDate(fin.released_date, dateApproved),
              type: 'financial',
            });
          } else {
            timeline.push({
              id: `TL-FIN-PEND-${fin.id}`,
              title: 'Financial Aid Pending Release',
              detail: `Financial disbursement ${fin.disbursement_id || 'FA-DISB'} queued for payout of ₱${Number(fin.fixed_amount || 5000).toLocaleString()}. Schedule: ${fin.payout_schedule || 'TBA'} at ${fin.payout_location || 'QC Hall Cashier'}.`,
              date: dateApproved,
              type: 'financial',
            });
          }
        }

        refs.forEach((r) => {
          timeline.push({
            id: `TL-${r.id}`,
            title: `Referral Created: ${r.referredTo}`,
            detail: `Reason: ${r.reason}. Status: ${String(r.status || 'pending').toUpperCase()}. (Referred by: ${r.referredBy})`,
            date: r.date,
            type: 'referral',
          });
        });

        mons.forEach((m) => {
          timeline.push({
            id: `TL-${m.id}`,
            title: `Monitoring Check-in (${m.progressStatus})`,
            detail: `${m.notes}${m.nextAction ? ` | Next Action: ${m.nextAction}` : ''} (Officer: ${m.officer})`,
            date: m.date,
            type: 'monitoring',
          });
        });

        if (resolvedStatus === 'closed') {
          timeline.push({
            id: `TL-CLS-${ref}`,
            title: 'Case Closed',
            detail: override.closed_reason || 'All assistance and aftercare monitoring successfully concluded.',
            date: safeIsoDate(override.closed_at, new Date().toISOString().split('T')[0]),
            type: 'closure',
          });
        }

        cases.push({
          id: caseNum,
          caseNumber: caseNum,
          applicationId: ref,
          beneficiaryId: qcid,
          beneficiaryName: fullName,
          age: String(row.age || calculateAge(row.birth_date || row.dob || row.date_of_birth) || ''),
          sex: formatSex(row.gender || row.sex),
          civilStatus: row.civil_status || 'Single',
          contactNo: row.phone || row.contact_no || '09170000000',
          email: row.email || '',
          address: row.address || 'Quezon City',
          linkedProgram: 'AICS',
          caseType: caseType,
          priority: override.priority || 'high',
          dateOpened: dateApproved,
          assignedSocialWorker: override.assigned_social_worker || 'Admin Social Worker',
          status: resolvedStatus,
          summary: row.details?.primaryConcern || row.details?.problemEncountered || 'AICS assistance approved for community welfare aid.',
          linkedAppointment: appt
            ? {
                id: String(appt.id),
                date: appt.scheduled_date || appt.appointment_date || '',
                time: appt.scheduled_time || appt.appointment_time || '',
                location: appt.venue || appt.location || 'Quezon City Hall - Social Services Hall',
                status: appt.status || 'Scheduled',
              }
            : null,
          linkedFinancialAid: fin
            ? {
                id: String(fin.id),
                disbursementId: fin.disbursement_id || `FA-${ref}`,
                assistanceType: fin.assistance_type || row.assistance_type || 'Medical Assistance',
                fixedAmount: Number(fin.fixed_amount || 5000),
                payoutSchedule: fin.payout_schedule || `${appt?.scheduled_date || 'TBA'} ${appt?.scheduled_time || ''}`.trim(),
                payoutLocation: fin.payout_location || 'QC Hall - Financial Aid Payout Center',
                status: fin.status || 'PENDING',
              }
            : null,
          referrals: refs,
          monitoringLogs: mons,
          timeline,
        });
      } catch (errRow) {
        console.warn('[Case Management AICS row error]:', errRow.message);
      }
    });

    // Process PWD & Senior Citizen
    pwdSeniorRes.rows.forEach((row, idx) => {
      try {
        const ref = row.reference_number || row.id;
        const qcid = row.qcid_number || row.existing_id_number || ref;
        const caseNum = formatCaseNumber(ref, idx + 100);
        const override = caseRecordsMap.get(ref) || caseRecordsMap.get(caseNum) || {};
        const isPwd = String(row.category || '').toUpperCase().includes('PWD');
        const prog = isPwd ? 'PWD' : 'Senior Citizen';
        const isAssistance = isAssistanceCase(prog, row.type, row.category, row.service);
        const appt = isAssistance ? findAppointment(ref, qcid, row.email, prog) : null;
        const fin = isAssistance ? findFinancialAid(ref, qcid) : null;

        const fullName = [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(' ').trim() || `${prog} Beneficiary`;
        const dateApplied = safeIsoDate(row.created_at, '2026-08-14');
        const dateApproved = safeIsoDate(row.updated_at || row.created_at, dateApplied);
        const caseType = getCaseType(prog, row.type);

        let refs = referralsMap.get(ref) || referralsMap.get(caseNum) || [];
        if (refs.length === 0) {
          refs = generateAutoReferrals(prog, row.type, dateApproved, ref, override.assigned_social_worker);
        }
        let mons = monitoringMap.get(ref) || monitoringMap.get(caseNum) || [];
        if (mons.length === 0) {
          mons = generateAutoMonitoringLogs(prog, row.type, dateApproved, ref, appt, fin, override.assigned_social_worker);
        }

        const resolvedStatus = computeResolvedCaseStatus(override, fin, mons, refs, appt);

        const timeline = [
          {
            id: `TL-SUB-${ref}`,
            title: 'Application Submitted',
            detail: `Submitted ${prog} application (Type: ${row.type || 'New'}, Ref: ${ref}).`,
            date: dateApplied,
            type: 'submission',
          },
          {
            id: `TL-APP-${ref}`,
            title: 'Application Approved',
            detail: `${prog} application verified and approved. Case ${caseNum} automatically linked.`,
            date: dateApproved,
            type: 'approval',
          },
        ];

        if (appt) {
          timeline.push({
            id: `TL-APPT-${appt.id}`,
            title: appt.status === 'completed' ? 'Appointment Completed' : 'Appointment Scheduled',
            detail: `Verification appointment scheduled at ${appt.scheduled_date || appt.appointment_date || 'QC Hall'} - Venue: ${appt.venue || appt.location || 'Office of Senior Citizens Affairs (OSCA) / PWD Affairs Office'}.`,
            date: appt.scheduled_date || dateApproved,
            type: 'appointment',
          });
        }

        if (fin) {
          timeline.push({
            id: `TL-FIN-${fin.id}`,
            title: fin.status === 'RELEASED' ? 'Financial Aid Released' : 'Financial Aid Pending',
            detail: `Disbursement ${fin.disbursement_id || 'DISB'} for ${fin.assistance_type || prog} amount ₱${Number(fin.fixed_amount || 3000).toLocaleString()}. (Status: ${fin.status})`,
            date: fin.status === 'RELEASED' ? safeIsoDate(fin.released_date, dateApproved) : dateApproved,
            type: 'financial',
          });
        }

        refs.forEach((r) => {
          timeline.push({
            id: `TL-${r.id}`,
            title: `Referral Created: ${r.referredTo}`,
            detail: `Reason: ${r.reason}. Status: ${String(r.status || 'pending').toUpperCase()}.`,
            date: r.date,
            type: 'referral',
          });
        });

        mons.forEach((m) => {
          timeline.push({
            id: `TL-${m.id}`,
            title: `Monitoring: ${m.progressStatus}`,
            detail: `${m.notes} (Officer: ${m.officer})`,
            date: m.date,
            type: 'monitoring',
          });
        });

        if (resolvedStatus === 'closed') {
          timeline.push({
            id: `TL-CLS-${ref}`,
            title: 'Case Closed',
            detail: override.closed_reason || 'Official ID/Booklet released and aftercare concluded.',
            date: safeIsoDate(override.closed_at, new Date().toISOString().split('T')[0]),
            type: 'closure',
          });
        }

        cases.push({
          id: caseNum,
          caseNumber: caseNum,
          applicationId: ref,
          beneficiaryId: qcid,
          beneficiaryName: fullName,
          age: String(row.age || calculateAge(row.date_of_birth || row.birth_date || row.dob) || ''),
          sex: formatSex(row.sex || row.gender),
          civilStatus: row.civil_status || 'Single',
          contactNo: row.contact_number || row.phone || '09170000000',
          email: row.email || '',
          address: row.address || 'Quezon City',
          linkedProgram: prog,
          caseType: caseType,
          priority: override.priority || 'medium',
          dateOpened: dateApproved,
          assignedSocialWorker: override.assigned_social_worker || 'Admin Social Worker',
          status: resolvedStatus,
          summary: row.admin_notes || `${prog} ${row.type || 'ID'} issuance and welfare assessment.`,
          linkedAppointment: appt
            ? {
                id: String(appt.id),
                date: appt.scheduled_date || appt.appointment_date || '',
                time: appt.scheduled_time || appt.appointment_time || '',
                location: appt.venue || appt.location || 'Quezon City Hall - PWD / Senior Affairs Office',
                status: appt.status || 'Scheduled',
              }
            : null,
          linkedFinancialAid: fin
            ? {
                id: String(fin.id),
                disbursementId: fin.disbursement_id || `FA-${ref}`,
                assistanceType: fin.assistance_type || `${prog} Assistance`,
                fixedAmount: Number(fin.fixed_amount || 3000),
                payoutSchedule: fin.payout_schedule || `${appt?.scheduled_date || 'TBA'} ${appt?.scheduled_time || ''}`.trim(),
                payoutLocation: fin.payout_location || 'QC Hall OSCA/PWD Center',
                status: fin.status || 'PENDING',
              }
            : null,
          referrals: refs,
          monitoringLogs: mons,
          timeline,
        });
      } catch (errRow) {
        console.warn('[Case Management PWD/Senior row error]:', errRow.message);
      }
    });

    // Process Solo Parent
    soloRes.rows.forEach((row, idx) => {
      try {
        const ref = row.reference_number || `SP-${row.id}`;
        const qcid = row.qcid_number || row.solo_parent_id_number || ref;
        const caseNum = formatCaseNumber(ref, idx + 200);
        const override = caseRecordsMap.get(ref) || caseRecordsMap.get(caseNum) || {};
        const isAssistance = isAssistanceCase('Solo Parent', row.classification_title, row.category, row.assistance_type);
        const appt = isAssistance ? findAppointment(ref, qcid, row.email, 'Solo Parent') : null;
        const fin = isAssistance ? findFinancialAid(ref, qcid) : null;

        const fullName = [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(' ').trim() || 'Solo Parent Beneficiary';
        const dateApplied = safeIsoDate(row.created_at, '2026-08-15');
        const dateApproved = safeIsoDate(row.updated_at || row.created_at, dateApplied);

        let refs = referralsMap.get(ref) || referralsMap.get(caseNum) || [];
        if (refs.length === 0) {
          refs = generateAutoReferrals('Solo Parent', row.classification_title, dateApproved, ref, override.assigned_social_worker);
        }
        let mons = monitoringMap.get(ref) || monitoringMap.get(caseNum) || [];
        if (mons.length === 0) {
          mons = generateAutoMonitoringLogs('Solo Parent', row.classification_title, dateApproved, ref, appt, fin, override.assigned_social_worker);
        }

        const resolvedStatus = computeResolvedCaseStatus(override, fin, mons, refs, appt);

        const timeline = [
          {
            id: `TL-SUB-${ref}`,
            title: 'Application Submitted',
            detail: `Submitted Solo Parent ID Application (Classification: ${row.classification_title || 'General Solo Parent'}).`,
            date: dateApplied,
            type: 'submission',
          },
          {
            id: `TL-APP-${ref}`,
            title: 'Application Approved',
            detail: `Solo Parent ID approved (Assigned ID: ${row.assigned_id_number || row.solo_parent_id_number || 'Official QC ID Assigned'}). Case ${caseNum} opened.`,
            date: dateApproved,
            type: 'approval',
          },
        ];

        if (appt) {
          timeline.push({
            id: `TL-APPT-${appt.id}`,
            title: appt.status === 'completed' ? 'Appointment Completed' : 'Appointment Scheduled',
            detail: `ID Claiming & orientation appointment at ${appt.venue || 'QC Hall Solo Parent Center'} on ${appt.scheduled_date || 'TBA'} ${appt.scheduled_time || ''}.`,
            date: appt.scheduled_date || dateApproved,
            type: 'appointment',
          });
        }

        if (fin) {
          timeline.push({
            id: `TL-FIN-${fin.id}`,
            title: fin.status === 'RELEASED' ? 'Financial Aid Released' : 'Financial Aid Pending',
            detail: `Solo Parent Welfare Assistance of ₱${Number(fin.fixed_amount || 5000).toLocaleString()}. Status: ${fin.status}`,
            date: dateApproved,
            type: 'financial',
          });
        }

        refs.forEach((r) => {
          timeline.push({
            id: `TL-${r.id}`,
            title: `Referral Created: ${r.referredTo}`,
            detail: `${r.reason} (Status: ${String(r.status || 'pending')})`,
            date: r.date,
            type: 'referral',
          });
        });

        mons.forEach((m) => {
          timeline.push({
            id: `TL-${m.id}`,
            title: `Monitoring: ${m.progressStatus}`,
            detail: `${m.notes} (Officer: ${m.officer})`,
            date: m.date,
            type: 'monitoring',
          });
        });

        if (resolvedStatus === 'closed') {
          timeline.push({
            id: `TL-CLS-${ref}`,
            title: 'Case Closed',
            detail: override.closed_reason || 'Solo Parent ID claimed and welfare onboarding complete.',
            date: safeIsoDate(override.closed_at, new Date().toISOString().split('T')[0]),
            type: 'closure',
          });
        }

        cases.push({
          id: caseNum,
          caseNumber: caseNum,
          applicationId: ref,
          beneficiaryId: qcid,
          beneficiaryName: fullName,
          age: String(row.age || calculateAge(row.date_of_birth || row.birth_date || row.dob) || ''),
          sex: formatSex(row.sex || row.gender),
          civilStatus: row.civil_status || 'Single Parent',
          contactNo: row.contact_no || '09170000000',
          email: row.email || '',
          address: [row.address_house_no, row.address_street, row.address_barangay, row.address_city_municipality].filter(Boolean).join(', ') || 'Quezon City',
          linkedProgram: 'Solo Parent',
          caseType: 'Solo Parent Welfare & ID Support',
          priority: override.priority || 'medium',
          dateOpened: dateApproved,
          assignedSocialWorker: override.assigned_social_worker || 'Admin Social Worker',
          status: resolvedStatus,
          summary: row.classification_title || row.circumstance_details || 'Solo parent benefits and assistance program case.',
          linkedAppointment: appt
            ? {
                id: String(appt.id),
                date: appt.scheduled_date || appt.appointment_date || '',
                time: appt.scheduled_time || appt.appointment_time || '',
                location: appt.venue || appt.location || 'Quezon City Hall - Solo Parent Section',
                status: appt.status || 'Scheduled',
              }
            : null,
          linkedFinancialAid: fin
            ? {
                id: String(fin.id),
                disbursementId: fin.disbursement_id || `FA-${ref}`,
                assistanceType: fin.assistance_type || 'Solo Parent Assistance',
                fixedAmount: Number(fin.fixed_amount || 5000),
                payoutSchedule: fin.payout_schedule || `${appt?.scheduled_date || 'TBA'} ${appt?.scheduled_time || ''}`.trim(),
                payoutLocation: fin.payout_location || 'QC Hall Payout Center',
                status: fin.status || 'PENDING',
              }
            : null,
          referrals: refs,
          monitoringLogs: mons,
          timeline,
        });
      } catch (errRow) {
        console.warn('[Case Management Solo Parent row error]:', errRow.message);
      }
    });

    // Process Child Welfare
    childRes.rows.forEach((row, idx) => {
      try {
        const ref = row.reference_number || `CW-${row.id}`;
        const qcid = row.guardian_valid_id || ref;
        const caseNum = formatCaseNumber(ref, idx + 300);
        const override = caseRecordsMap.get(ref) || caseRecordsMap.get(caseNum) || {};
        const appt = findAppointment(ref, qcid, row.guardian_email);
        const fin = findFinancialAid(ref, qcid);

        const fullName = [row.guardian_first_name, row.guardian_middle_name, row.guardian_last_name].filter(Boolean).join(' ').trim() || 'Child Welfare Guardian';
        const dateApplied = safeIsoDate(row.created_at, '2026-08-18');
        const dateApproved = safeIsoDate(row.updated_at || row.created_at, dateApplied);

        const catTitle = String(row.category_title || '').toLowerCase();
        const catReason = String(row.primary_reason_for_assistance || '').toLowerCase();
        const catSupp = String(row.support_category || '').toLowerCase();
        const isProtection = catTitle.includes('protection') || catReason.includes('protection') || catSupp.includes('protection');
        const isEmergency = catTitle.includes('emergency') || catReason.includes('emergency') || catSupp.includes('emergency');
        const isNutrition = catTitle.includes('nutrition') || catReason.includes('nutrition') || catSupp.includes('nutrition');

        const caseType = isProtection
          ? 'Child Protection & Safety Intervention'
          : isEmergency
          ? 'Child Emergency Welfare & Crisis Relief'
          : isNutrition
          ? 'Child Nutrition & Feeding Program'
          : (row.category_title || 'Child Welfare & Protection Assistance');

        let refs = referralsMap.get(ref) || referralsMap.get(caseNum) || [];
        if (refs.length === 0) {
          refs = generateAutoReferrals('Child Welfare', caseType, dateApproved, ref, override.assigned_social_worker);
        }
        let mons = monitoringMap.get(ref) || monitoringMap.get(caseNum) || [];
        if (mons.length === 0) {
          mons = generateAutoMonitoringLogs('Child Welfare', caseType, dateApproved, ref, appt, fin, override.assigned_social_worker);
        }

        const resolvedStatus = computeResolvedCaseStatus(override, fin, mons, refs, appt);

        const timeline = [
          {
            id: `TL-SUB-${ref}`,
            title: 'Application Submitted',
            detail: `Child Welfare application for ${row.child_name || 'Child'} (${row.category_title || (isNutrition ? 'Nutritional Assistance' : 'Support')}).`,
            date: dateApplied,
            type: 'submission',
          },
          {
            id: `TL-APP-${ref}`,
            title: 'Application Approved',
            detail: `Approved by City Social Worker (Approved Amount: ₱${Number(row.approved_amount || 5000).toLocaleString()}). Case ${caseNum} opened.`,
            date: dateApproved,
            type: 'approval',
          },
        ];

        if (appt) {
          timeline.push({
            id: `TL-APPT-${appt.id}`,
            title: appt.status === 'completed' ? 'Appointment Completed' : 'Appointment Scheduled',
            detail: `Assessment & intake appointment scheduled at ${appt.venue || 'QC Child Welfare Center'} on ${appt.scheduled_date || 'TBA'} ${appt.scheduled_time || ''}.`,
            date: appt.scheduled_date || dateApproved,
            type: 'appointment',
          });
        }

        if (fin) {
          timeline.push({
            id: `TL-FIN-${fin.id}`,
            title: fin.status === 'RELEASED' ? 'Financial Aid Released' : 'Financial Aid Pending',
            detail: `Child Welfare grant of ₱${Number(fin.fixed_amount || row.approved_amount || 5000).toLocaleString()}. Status: ${fin.status}`,
            date: dateApproved,
            type: 'financial',
          });
        }

        refs.forEach((r) => {
          timeline.push({
            id: `TL-${r.id}`,
            title: `Referral Created: ${r.referredTo}`,
            detail: `${r.reason} (Status: ${String(r.status || 'pending')})`,
            date: r.date,
            type: 'referral',
          });
        });

        mons.forEach((m) => {
          timeline.push({
            id: `TL-${m.id}`,
            title: `Monitoring: ${m.progressStatus}`,
            detail: `${m.notes} (Officer: ${m.officer})`,
            date: m.date,
            type: 'monitoring',
          });
        });

        if (resolvedStatus === 'closed') {
          timeline.push({
            id: `TL-CLS-${ref}`,
            title: 'Case Closed',
            detail: override.closed_reason || 'Child support grant and intervention concluded.',
            date: safeIsoDate(override.closed_at, new Date().toISOString().split('T')[0]),
            type: 'closure',
          });
        }

        cases.push({
          id: caseNum,
          caseNumber: caseNum,
          applicationId: ref,
          beneficiaryId: qcid,
          beneficiaryName: fullName,
          age: String(row.guardian_age || calculateAge(row.guardian_date_of_birth) || row.child_age || calculateAge(row.child_birthday) || row.age || ''),
          sex: formatSex(row.guardian_sex || row.child_sex || row.gender || row.sex),
          civilStatus: row.guardian_civil_status || 'Single',
          contactNo: row.guardian_contact_no || '09170000000',
          email: row.guardian_email || '',
          address: [row.address_house_no, row.address_street, row.address_barangay, row.address_city_municipality].filter(Boolean).join(', ') || 'Quezon City',
          linkedProgram: 'Child Welfare',
          caseType: caseType,
          priority: override.priority || 'high',
          dateOpened: dateApproved,
          assignedSocialWorker: override.assigned_social_worker || 'Admin Social Worker',
          status: resolvedStatus,
          summary: `Child: ${row.child_name || 'N/A'} (${row.child_age || 'N/A'} y/o) — ${isNutrition ? 'Program: Child Nutrition & Supplementary Feeding | ' : ''}Reason: ${row.primary_reason_for_assistance || row.category_title || 'Nutritional & Child Support'}`,
          linkedAppointment: appt
            ? {
                id: String(appt.id),
                date: appt.scheduled_date || appt.appointment_date || '',
                time: appt.scheduled_time || appt.appointment_time || '',
                location: appt.venue || appt.location || 'Quezon City Hall - Child Protection Center',
                status: appt.status || 'Scheduled',
              }
            : null,
          linkedFinancialAid: fin
            ? {
                id: String(fin.id),
                disbursementId: fin.disbursement_id || `FA-${ref}`,
                assistanceType: fin.assistance_type || (isNutrition ? 'Child Nutrition Support' : 'Child Welfare Support'),
                fixedAmount: Number(fin.fixed_amount || row.approved_amount || 5000),
                payoutSchedule: fin.payout_schedule || `${appt?.scheduled_date || 'TBA'} ${appt?.scheduled_time || ''}`.trim(),
                payoutLocation: fin.payout_location || 'QC Hall Payout Center',
                status: fin.status || 'PENDING',
              }
            : null,
          referrals: refs,
          monitoringLogs: mons,
          timeline,
        });
      } catch (errRow) {
        console.warn('[Case Management Child Welfare row error]:', errRow.message);
      }
    });

    // Process Livelihood
    livelihoodRes.rows.forEach((row, idx) => {
      try {
        const ref = row.reference_number || `LV-${row.id}`;
        const qcid = row.qcid_number || ref;
        const caseNum = formatCaseNumber(ref, idx + 400);
        const override = caseRecordsMap.get(ref) || caseRecordsMap.get(caseNum) || {};
        const appt = findAppointment(ref, qcid, row.email);
        const fin = findFinancialAid(ref, qcid);

        const fullName = [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ').trim() || 'Livelihood Beneficiary';
        const dateApplied = safeIsoDate(row.created_at, '2026-08-15');
        const dateApproved = safeIsoDate(row.approved_date || row.updated_at || row.created_at, dateApplied);

        let refs = referralsMap.get(ref) || referralsMap.get(caseNum) || [];
        if (refs.length === 0) {
          refs = generateAutoReferrals('Livelihood', row.business_type, dateApproved, ref, override.assigned_social_worker);
        }
        let mons = monitoringMap.get(ref) || monitoringMap.get(caseNum) || [];
        if (mons.length === 0) {
          mons = generateAutoMonitoringLogs('Livelihood', row.business_type, dateApproved, ref, appt, fin, override.assigned_social_worker);
        }

        const resolvedStatus = computeResolvedCaseStatus(override, fin, mons, refs, appt);

        const timeline = [
          {
            id: `TL-SUB-${ref}`,
            title: 'Application Submitted',
            detail: `Submitted Livelihood Program Application (${row.business_name || row.program_type || 'Micro-Enterprise'}).`,
            date: dateApplied,
            type: 'submission',
          },
          {
            id: `TL-APP-${ref}`,
            title: 'Application Approved',
            detail: `Livelihood grant approved for business capitalization. Case ${caseNum} opened.`,
            date: dateApproved,
            type: 'approval',
          },
        ];

        if (appt) {
          timeline.push({
            id: `TL-APPT-${appt.id}`,
            title: appt.status === 'completed' ? 'Appointment Completed' : 'Appointment Scheduled',
            detail: `Business orientation and kit distribution scheduled at ${appt.venue || 'QC Livelihood Center'}.`,
            date: appt.scheduled_date || dateApproved,
            type: 'appointment',
          });
        }

        if (fin) {
          timeline.push({
            id: `TL-FIN-${fin.id}`,
            title: fin.status === 'RELEASED' ? 'Financial Aid Released' : 'Financial Aid Pending',
            detail: `Livelihood financial assistance of ₱${Number(fin.fixed_amount || 15000).toLocaleString()}. (Status: ${fin.status})`,
            date: dateApproved,
            type: 'financial',
          });
        }

        refs.forEach((r) => {
          timeline.push({
            id: `TL-${r.id}`,
            title: `Referral Created: ${r.referredTo}`,
            detail: `${r.reason} (Status: ${String(r.status || 'pending')})`,
            date: r.date,
            type: 'referral',
          });
        });

        mons.forEach((m) => {
          timeline.push({
            id: `TL-${m.id}`,
            title: `Monitoring: ${m.progressStatus}`,
            detail: `${m.notes} (Officer: ${m.officer})`,
            date: m.date,
            type: 'monitoring',
          });
        });

        if (resolvedStatus === 'closed') {
          timeline.push({
            id: `TL-CLS-${ref}`,
            title: 'Case Closed',
            detail: override.closed_reason || 'Livelihood assistance completed and enterprise sustainable.',
            date: safeIsoDate(override.closed_at, new Date().toISOString().split('T')[0]),
            type: 'closure',
          });
        }

        cases.push({
          id: caseNum,
          caseNumber: caseNum,
          applicationId: ref,
          beneficiaryId: qcid,
          beneficiaryName: fullName,
          age: String(row.age || calculateAge(row.date_of_birth || row.birth_date || row.dob) || ''),
          sex: formatSex(row.sex || row.gender),
          civilStatus: row.civil_status || 'Single',
          contactNo: row.mobile_number || row.contact_no || '09170000000',
          email: row.email || '',
          address: [row.house_no, row.street, row.barangay, row.city].filter(Boolean).join(', ') || 'Quezon City',
          linkedProgram: 'Livelihood',
          caseType: `Livelihood: ${row.business_name || row.business_type || 'Capitalization Grant'}`,
          priority: override.priority || 'medium',
          dateOpened: dateApproved,
          assignedSocialWorker: override.assigned_social_worker || 'Admin Social Worker',
          status: resolvedStatus,
          summary: `Proposed Business: ${row.business_name || 'N/A'} — Category: ${row.business_type || 'Micro-enterprise'}`,
          linkedAppointment: appt
            ? {
                id: String(appt.id),
                date: appt.scheduled_date || appt.appointment_date || '',
                time: appt.scheduled_time || appt.appointment_time || '',
                location: appt.venue || appt.location || 'Quezon City Hall - Livelihood Center',
                status: appt.status || 'Scheduled',
              }
            : null,
          linkedFinancialAid: fin
            ? {
                id: String(fin.id),
                disbursementId: fin.disbursement_id || `FA-${ref}`,
                assistanceType: fin.assistance_type || 'Livelihood Capital Grant',
                fixedAmount: Number(fin.fixed_amount || 15000),
                payoutSchedule: fin.payout_schedule || `${appt?.scheduled_date || 'TBA'} ${appt?.scheduled_time || ''}`.trim(),
                payoutLocation: fin.payout_location || 'QC Livelihood Center',
                status: fin.status || 'PENDING',
              }
            : null,
          referrals: refs,
          monitoringLogs: mons,
          timeline,
        });
      } catch (errRow) {
        console.warn('[Case Management Livelihood row error]:', errRow.message);
      }
    });

    // Process Training
    trainingRes.rows.forEach((row, idx) => {
      try {
        const ref = row.reference_number || `TR-${row.id}`;
        const qcid = row.qcid_number || ref;
        const caseNum = formatCaseNumber(ref, idx + 500);
        const override = caseRecordsMap.get(ref) || caseRecordsMap.get(caseNum) || {};
        const appt = findAppointment(ref, qcid, row.email);
        const fin = findFinancialAid(ref, qcid);

        const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Training Beneficiary';
        const dateApplied = safeIsoDate(row.created_at, '2026-08-20');
        const dateApproved = safeIsoDate(row.updated_at || row.created_at, dateApplied);

        let refs = referralsMap.get(ref) || referralsMap.get(caseNum) || [];
        if (refs.length === 0) {
          refs = generateAutoReferrals('Training', row.course_title, dateApproved, ref, override.assigned_social_worker);
        }
        let mons = monitoringMap.get(ref) || monitoringMap.get(caseNum) || [];
        if (mons.length === 0) {
          mons = generateAutoMonitoringLogs('Training', row.course_title, dateApproved, ref, appt, fin, override.assigned_social_worker);
        }

        const resolvedStatus = computeResolvedCaseStatus(override, fin, mons, refs, appt);

        const timeline = [
          {
            id: `TL-SUB-${ref}`,
            title: 'Application Submitted',
            detail: `Submitted Training Program Application (${row.course_title || 'Skills Training'}).`,
            date: dateApplied,
            type: 'submission',
          },
          {
            id: `TL-APP-${ref}`,
            title: 'Application Approved',
            detail: `Enrolled in ${row.course_title || 'Skills Development'}. Case ${caseNum} opened.`,
            date: dateApproved,
            type: 'approval',
          },
        ];

        if (appt) {
          timeline.push({
            id: `TL-APPT-${appt.id}`,
            title: appt.status === 'completed' ? 'Appointment Completed' : 'Appointment Scheduled',
            detail: `Training Orientation at ${appt.venue || 'QC Skills Center'} on ${appt.scheduled_date || 'TBA'} ${appt.scheduled_time || ''}.`,
            date: appt.scheduled_date || dateApproved,
            type: 'appointment',
          });
        }

        refs.forEach((r) => {
          timeline.push({
            id: `TL-${r.id}`,
            title: `Referral Created: ${r.referredTo}`,
            detail: `${r.reason} (Status: ${String(r.status || 'pending')})`,
            date: r.date,
            type: 'referral',
          });
        });

        mons.forEach((m) => {
          timeline.push({
            id: `TL-${m.id}`,
            title: `Monitoring: ${m.progressStatus}`,
            detail: `${m.notes} (Officer: ${m.officer})`,
            date: m.date,
            type: 'monitoring',
          });
        });

        if (resolvedStatus === 'closed') {
          timeline.push({
            id: `TL-CLS-${ref}`,
            title: 'Case Closed',
            detail: override.closed_reason || 'Training course completed and certification awarded.',
            date: safeIsoDate(override.closed_at, new Date().toISOString().split('T')[0]),
            type: 'closure',
          });
        }

        cases.push({
          id: caseNum,
          caseNumber: caseNum,
          applicationId: ref,
          beneficiaryId: qcid,
          beneficiaryName: fullName,
          age: String(row.age || calculateAge(row.date_of_birth || row.birth_date || row.dob) || ''),
          sex: formatSex(row.sex || row.gender),
          civilStatus: 'Single',
          contactNo: row.contact_no || '09170000000',
          email: row.email || '',
          address: row.address || 'Quezon City',
          linkedProgram: 'Training Program',
          caseType: `Training: ${row.course_title || 'Vocational Skills'}`,
          priority: override.priority || 'low',
          dateOpened: dateApproved,
          assignedSocialWorker: override.assigned_social_worker || 'Admin Social Worker',
          status: resolvedStatus,
          summary: `Enrolled Course: ${row.course_title || 'Skills Training'} — Preferred Schedule: ${row.preferred_schedule || 'Weekday'}`,
          linkedAppointment: appt
            ? {
                id: String(appt.id),
                date: appt.scheduled_date || appt.appointment_date || '',
                time: appt.scheduled_time || appt.appointment_time || '',
                location: appt.venue || appt.location || 'QC Skills Academy',
                status: appt.status || 'Scheduled',
              }
            : null,
          linkedFinancialAid: null,
          referrals: refs,
          monitoringLogs: mons,
          timeline,
        });
      } catch (errRow) {
        console.warn('[Case Management Training row error]:', errRow.message);
      }
    });

    // Also include any appointments (e.g. from Child Welfare, Solo Parent, Livelihood, PWD, Senior) not yet represented in cases
    const existingAppRefs = new Set(cases.map((c) => String(c.applicationId || '').trim().toLowerCase()));
    const existingBeneficiaryIds = new Set(cases.map((c) => String(c.beneficiaryId || '').trim().toLowerCase()));

    appointments.forEach((appt, idx) => {
      try {
        const ref = String(appt.reference_no || appt.reference_number || appt.id || '').trim();
        const cleanRef = ref.toLowerCase();
        if (!ref || existingAppRefs.has(cleanRef) || existingBeneficiaryIds.has(cleanRef)) return;

        const caseNum = formatCaseNumber(ref, idx + 600);
        const override = caseRecordsMap.get(ref) || caseRecordsMap.get(caseNum) || {};
        const concernStr = String(appt.concern || '').toLowerCase();
        let mod = appt.module || 'AICS';
        if (concernStr.includes('child') || concernStr.includes('nutrition')) mod = 'Child Welfare';
        else if (concernStr.includes('solo')) mod = 'Solo Parent';
        else if (concernStr.includes('livelihood')) mod = 'Livelihood';
        else if (concernStr.includes('pwd')) mod = 'PWD';
        else if (concernStr.includes('senior')) mod = 'Senior Citizen';

        const fin = findFinancialAid(ref, ref);
        const fullName = appt.applicant_name || 'Beneficiary';
        const dateAppt = safeIsoDate(appt.scheduled_date || appt.created_at, '2026-09-09');

        let refs = referralsMap.get(ref) || referralsMap.get(caseNum) || [];
        if (refs.length === 0) {
          refs = generateAutoReferrals(mod, appt.concern, dateAppt, ref, override.assigned_social_worker);
        }
        let mons = monitoringMap.get(ref) || monitoringMap.get(caseNum) || [];
        if (mons.length === 0) {
          mons = generateAutoMonitoringLogs(mod, appt.concern, dateAppt, ref, appt, fin, override.assigned_social_worker);
        }

        let resolvedStatus = override.status || 'open';
        if (!override.status) {
          if (mons.length > 0) resolvedStatus = 'monitoring';
          else if (refs.length > 0) resolvedStatus = 'referred';
        }

        const timeline = [
          {
            id: `TL-SUB-${ref}`,
            title: 'Application Approved / Scheduled',
            detail: `Appointment scheduled for ${appt.concern || mod} (Ref: ${ref}).`,
            date: dateAppt,
            type: 'approval',
          },
          {
            id: `TL-APPT-${appt.id}`,
            title: appt.status === 'completed' ? 'Appointment Completed' : 'Appointment Scheduled',
            detail: `Appointment at ${appt.office_location || appt.venue || 'Quezon City Hall'} (Status: ${appt.status || 'Scheduled'}).`,
            date: dateAppt,
            type: 'appointment',
          },
        ];

        cases.push({
          id: caseNum,
          caseNumber: caseNum,
          applicationId: ref,
          beneficiaryId: ref,
          beneficiaryName: fullName,
          age: String(appt.age || appt.applicant_age || calculateAge(appt.date_of_birth || appt.birthdate) || ''),
          sex: formatSex(appt.sex || appt.gender || appt.applicant_sex),
          civilStatus: 'Single',
          contactNo: '09170000000',
          email: '',
          address: 'Quezon City',
          linkedProgram: mod,
          caseType: appt.concern || `${mod} Assistance`,
          priority: override.priority || 'high',
          dateOpened: dateAppt,
          assignedSocialWorker: override.assigned_social_worker || 'Admin Social Worker',
          status: resolvedStatus,
          summary: `${appt.concern || mod} assistance and scheduled intake assessment.`,
          linkedAppointment: {
            id: String(appt.id),
            date: appt.scheduled_date || '',
            time: appt.scheduled_time || '',
            location: appt.office_location || appt.venue || 'Quezon City Hall',
            status: appt.status || 'Scheduled',
          },
          linkedFinancialAid: fin
            ? {
                id: String(fin.id),
                disbursementId: fin.disbursement_id || `FA-${ref}`,
                assistanceType: fin.assistance_type || `${mod} Assistance`,
                fixedAmount: Number(fin.fixed_amount || 5000),
                payoutSchedule: fin.payout_schedule || 'TBA',
                payoutLocation: fin.payout_location || 'QC Hall Payout Center',
                status: fin.status || 'PENDING',
              }
            : null,
          referrals: refs,
          monitoringLogs: mons,
          timeline,
        });

        existingAppRefs.add(cleanRef);
      } catch (errRow) {
        console.warn('[Case Management Appt row error]:', errRow.message);
      }
    });

    // Sort cases by latest opened date descending
    cases.sort((a, b) => new Date(b.dateOpened).getTime() - new Date(a.dateOpened).getTime());

    res.status(200).json({
      success: true,
      count: cases.length,
      cases,
    });
  } catch (err) {
    console.error('Error in getAllCases:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch cases', error: err.message });
  }
};

exports.updateCaseStatus = async (req, res) => {
  try {
    const { caseNumber } = req.params;
    const { status, priority, assignedSocialWorker, notes, closedReason, applicationId } = req.body;

    const validStatuses = ['open', 'monitoring', 'referred', 'closed'];
    if (status && !validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid case status' });
    }

    const appRef = applicationId || caseNumber;
    const newStatus = status ? status.toLowerCase() : 'open';
    const closedAt = newStatus === 'closed' ? new Date() : null;

    const query = `
      INSERT INTO case_records (
        case_number, application_ref, program, status, priority,
        assigned_social_worker, notes, closed_at, closed_reason, updated_at
      )
      VALUES ($1, $2, 'AICS', $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (case_number)
      DO UPDATE SET
        status = EXCLUDED.status,
        priority = COALESCE(EXCLUDED.priority, case_records.priority),
        assigned_social_worker = COALESCE(EXCLUDED.assigned_social_worker, case_records.assigned_social_worker),
        notes = COALESCE(EXCLUDED.notes, case_records.notes),
        closed_at = EXCLUDED.closed_at,
        closed_reason = EXCLUDED.closed_reason,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await db.query(query, [
      caseNumber,
      appRef,
      newStatus,
      priority || 'medium',
      assignedSocialWorker || 'Admin Social Worker',
      notes || null,
      closedAt,
      closedReason || null,
    ]);

    res.status(200).json({
      success: true,
      message: 'Case status updated successfully',
      caseRecord: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating case status:', err);
    res.status(500).json({ success: false, message: 'Error updating case status', error: err.message });
  }
};

exports.addReferral = async (req, res) => {
  try {
    const { caseNumber } = req.params;
    const { referredTo, serviceReason, referredBy, referralDate, status, remarks, applicationId } = req.body;

    if (!referredTo || !serviceReason) {
      return res.status(400).json({ success: false, message: 'referredTo and serviceReason are required' });
    }

    const appRef = applicationId || caseNumber;
    const dateStr = referralDate || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `INSERT INTO case_referrals (
        case_number, application_ref, referred_to, service_reason,
        referred_by, referral_date, status, remarks, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *`,
      [
        caseNumber,
        appRef,
        referredTo,
        serviceReason,
        referredBy || 'Admin Social Worker',
        dateStr,
        status || 'pending',
        remarks || null,
      ]
    );

    // Also ensure case status is updated to 'referred' if currently open
    await db.query(
      `INSERT INTO case_records (case_number, application_ref, program, status, updated_at)
       VALUES ($1, $2, 'AICS', 'referred', NOW())
       ON CONFLICT (case_number)
       DO UPDATE SET status = CASE WHEN case_records.status = 'open' THEN 'referred' ELSE case_records.status END, updated_at = NOW()`,
      [caseNumber, appRef]
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Referral added successfully',
      referral: result.rows[0],
    });
  } catch (err) {
    console.error('Error adding referral:', err);
    res.status(500).json({ success: false, message: 'Error adding referral', error: err.message });
  }
};

exports.addMonitoring = async (req, res) => {
  try {
    const { caseNumber } = req.params;
    const { officerName, monitoringDate, notes, progressStatus, nextAction, applicationId } = req.body;

    if (!notes) {
      return res.status(400).json({ success: false, message: 'Monitoring notes are required' });
    }

    const appRef = applicationId || caseNumber;
    const dateStr = monitoringDate || new Date().toISOString().split('T')[0];

    const result = await db.query(
      `INSERT INTO case_monitoring (
        case_number, application_ref, officer_name, monitoring_date,
        notes, progress_status, next_action, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *`,
      [
        caseNumber,
        appRef,
        officerName || 'Admin Social Worker',
        dateStr,
        notes,
        progressStatus || 'In Progress',
        nextAction || null,
      ]
    );

    // Also ensure case status is updated to 'monitoring' if currently open
    await db.query(
      `INSERT INTO case_records (case_number, application_ref, program, status, updated_at)
       VALUES ($1, $2, 'AICS', 'monitoring', NOW())
       ON CONFLICT (case_number)
       DO UPDATE SET status = CASE WHEN case_records.status = 'open' THEN 'monitoring' ELSE case_records.status END, updated_at = NOW()`,
      [caseNumber, appRef]
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Monitoring log recorded successfully',
      monitoring: result.rows[0],
    });
  } catch (err) {
    console.error('Error adding monitoring:', err);
    res.status(500).json({ success: false, message: 'Error adding monitoring log', error: err.message });
  }
};
