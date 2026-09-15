const db = require('../config/db');

// In-memory fallback if database query fails or tables are initializing
let memoryBeneficiaries = [];
let memoryVerifications = [];
let memoryHistory = [];

/**
 * Automatically synchronize real users and applicants from all service tables into beneficiaries table
 * and purge any obsolete mock/dummy records.
 */
async function insertBeneficiaryIfMissing(applicantData) {
  try {
    const {
      userId,
      firstName,
      middleName,
      lastName,
      suffix,
      fullName,
      age,
      sex,
      civilStatus,
      address,
      contactNo,
      email,
      qcid,
      createdAt,
    } = applicantData;

    const resolvedName = (
      fullName ||
      [firstName, middleName, lastName, suffix].filter(Boolean).join(' ') ||
      email ||
      'Citizen Beneficiary'
    ).trim().toUpperCase();

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanQcid = (qcid || '').trim();
    const cleanFirst = (firstName || '').trim().toLowerCase();
    const cleanLast = (lastName || '').trim().toLowerCase();
    const parsedUserId = userId && !isNaN(parseInt(userId, 10)) ? parseInt(userId, 10) : null;

    const searchConditions = [];
    const searchParams = [];
    let pIdx = 1;

    if (parsedUserId) {
      searchConditions.push(`user_id = $${pIdx++}`);
      searchParams.push(parsedUserId);
    }
    if (cleanEmail) {
      searchConditions.push(`(email IS NOT NULL AND LOWER(email) = $${pIdx++})`);
      searchParams.push(cleanEmail);
    }
    if (cleanQcid) {
      searchConditions.push(`(qcid_number IS NOT NULL AND qcid_number = $${pIdx++})`);
      searchParams.push(cleanQcid);
    }
    if (cleanFirst && cleanLast) {
      searchConditions.push(`(LOWER(first_name) = $${pIdx} AND LOWER(last_name) = $${pIdx + 1})`);
      searchParams.push(cleanFirst, cleanLast);
      pIdx += 2;
    }
    if (resolvedName && resolvedName !== 'CITIZEN BENEFICIARY') {
      searchConditions.push(`(full_name IS NOT NULL AND LOWER(full_name) = $${pIdx++})`);
      searchParams.push(resolvedName.toLowerCase());
    }

    if (searchConditions.length === 0) return;

    const existing = await db.query(
      `SELECT id, civil_status FROM beneficiaries WHERE ${searchConditions.join(' OR ')} LIMIT 1`,
      searchParams
    ).catch(() => ({ rows: [] }));

    if (existing.rows.length === 0) {
      const bnfNumber = await generateBeneficiaryNumber();
      await db.query(
        `INSERT INTO beneficiaries (
          user_id, beneficiary_number, full_name, first_name, middle_name, last_name, suffix,
          age, sex, civil_status, address, contact_no, email, qcid_number, household_members,
          verification_status, verified_by, verification_date, verification_remarks,
          id_type, id_number, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, '1',
          'pending', NULL, NULL, 'Pending identity verification by Social Worker.',
          $15, $16, $17, NOW()
        ) ON CONFLICT (beneficiary_number) DO NOTHING`,
        [
          parsedUserId,
          bnfNumber,
          resolvedName,
          firstName || null,
          middleName || null,
          lastName || null,
          suffix || null,
          age ? String(age) : '—',
          sex || '—',
          civilStatus && civilStatus !== '—' ? civilStatus : 'Single',
          address || 'Quezon City',
          contactNo || '—',
          email || null,
          cleanQcid || null,
          cleanQcid ? 'QCitizen ID' : 'Government ID',
          cleanQcid || null,
          createdAt || new Date(),
        ]
      ).catch(() => {});
    } else if (civilStatus && civilStatus !== '—' && (!existing.rows[0].civil_status || existing.rows[0].civil_status === '—')) {
      await db.query(`UPDATE beneficiaries SET civil_status = $1 WHERE id = $2`, [civilStatus, existing.rows[0].id]).catch(() => {});
    }
  } catch (err) {
    console.warn('⚠️ insertBeneficiaryIfMissing error:', err.message);
  }
}

async function syncRealUsersAndApplicantsToBeneficiaries() {
  try {
    // 1. Ensure existing names are uppercase and civil_status is defaulted
    await db.query(`UPDATE beneficiaries SET full_name = UPPER(full_name)`).catch(() => {});
    await db.query(`UPDATE beneficiaries SET civil_status = 'Single' WHERE civil_status IS NULL OR civil_status = '' OR civil_status = '—'`).catch(() => {});
    
    // Ensure all registered accounts require social worker verification (not auto-verified)
    await db.query(`
      UPDATE beneficiaries 
      SET verification_status = 'pending', verified_by = NULL, verification_date = NULL, verification_remarks = 'Pending identity verification by Social Worker.'
      WHERE verified_by = 'System Auto-Verification' OR verified_by IS NULL OR verification_status IS NULL
    `).catch(() => {});

    // Remove synthetic auto-verification history events
    await db.query(`DELETE FROM beneficiary_history WHERE performed_by = 'System Auto-Verification'`).catch(() => {});

    // 1.5 Deduplicate & merge any duplicate beneficiary profiles with matching full_name or (first_name + last_name)
    const allBnf = await db.query(`SELECT id, full_name, first_name, last_name, user_id, qcid_number, email FROM beneficiaries ORDER BY id ASC`).catch(() => ({ rows: [] }));
    const seenNames = new Map();
    for (const row of allBnf.rows || []) {
      const normName = (row.full_name || `${row.first_name || ''} ${row.last_name || ''}`).trim().toUpperCase().replace(/\s+/g, ' ');
      if (!normName) continue;
      if (seenNames.has(normName)) {
        const keepId = seenNames.get(normName);
        await db.query(`UPDATE beneficiary_history SET beneficiary_id = $1 WHERE beneficiary_id = $2`, [keepId, row.id]).catch(() => {});
        await db.query(`DELETE FROM beneficiaries WHERE id = $1`, [row.id]).catch(() => {});
      } else {
        seenNames.set(normName, row.id);
      }
    }

    // 2. Fetch all real users from users table
    const usersRes = await db.query(`SELECT * FROM users ORDER BY id ASC`).catch(() => ({ rows: [] }));
    const users = usersRes.rows || [];

    for (const u of users) {
      const addressParts = [
        u.house_no,
        u.street,
        u.barangay ? `Brgy. ${u.barangay}` : null,
        u.city || 'Quezon City',
      ].filter(Boolean);
      const resolvedAddress = addressParts.join(', ') || 'Quezon City';

      let calcAge = null;
      if (u.birth_year && !isNaN(parseInt(u.birth_year, 10))) {
        calcAge = String(new Date().getFullYear() - parseInt(u.birth_year, 10));
      } else if (u.birth_date) {
        const bYear = new Date(u.birth_date).getFullYear();
        if (!isNaN(bYear)) calcAge = String(new Date().getFullYear() - bYear);
      }

      await insertBeneficiaryIfMissing({
        userId: u.id,
        firstName: u.first_name,
        middleName: u.middle_name,
        lastName: u.last_name,
        suffix: u.suffix,
        age: calcAge,
        sex: u.sex,
        civilStatus: u.civil_status,
        address: resolvedAddress,
        contactNo: u.mobile_number,
        email: u.email,
        qcid: u.qcid_number,
        createdAt: u.created_at,
      });
    }

    // 3. Sync applicants from AICS applications
    const aicsRes = await db.query(`SELECT * FROM aics_applications ORDER BY id ASC`).catch(() => ({ rows: [] }));
    for (const a of aicsRes.rows || []) {
      await insertBeneficiaryIfMissing({
        firstName: a.first_name,
        middleName: a.middle_name,
        lastName: a.last_name,
        suffix: a.suffix,
        age: a.age,
        sex: a.gender,
        civilStatus: a.civil_status,
        address: a.address,
        contactNo: a.phone,
        email: a.email,
        qcid: a.qc_id,
        createdAt: a.created_at,
      });
    }

    // 4. Sync applicants from PWD / Senior applications
    const pwdRes = await db.query(`SELECT * FROM pwd_senior_applications ORDER BY id ASC`).catch(() => ({ rows: [] }));
    for (const p of pwdRes.rows || []) {
      await insertBeneficiaryIfMissing({
        firstName: p.first_name,
        middleName: p.middle_name,
        lastName: p.last_name,
        suffix: p.suffix,
        age: p.age,
        sex: p.gender || p.sex,
        civilStatus: p.civil_status,
        address: p.address,
        contactNo: p.contact_number || p.mobile_number || p.phone,
        email: p.email,
        qcid: p.reference_number || p.qcid_number,
        createdAt: p.submitted_at || p.created_at,
      });
    }

    // 5. Sync applicants from Solo Parent applications
    const soloRes = await db.query(`SELECT * FROM solo_parent_applications ORDER BY id ASC`).catch(() => ({ rows: [] }));
    for (const s of soloRes.rows || []) {
      await insertBeneficiaryIfMissing({
        firstName: s.first_name,
        middleName: s.middle_name,
        lastName: s.last_name,
        suffix: s.suffix,
        age: s.age,
        sex: s.gender || s.sex,
        civilStatus: s.civil_status,
        address: s.address,
        contactNo: s.contact_no || s.phone,
        email: s.email,
        qcid: s.qcid_number,
        createdAt: s.created_at,
      });
    }

    // 6. Sync applicants from Child Welfare applications
    const childRes = await db.query(`SELECT * FROM solo_parent_applications WHERE module_type = 'CHILD_WELFARE' ORDER BY id ASC`).catch(() => ({ rows: [] }));
    for (const c of childRes.rows || []) {
      await insertBeneficiaryIfMissing({
        firstName: c.guardian_first_name || c.first_name,
        middleName: c.guardian_middle_name || c.middle_name,
        lastName: c.guardian_last_name || c.last_name,
        suffix: c.guardian_suffix || c.suffix,
        address: c.address,
        contactNo: c.guardian_contact_no || c.contact_no || c.phone,
        email: c.guardian_email || c.email,
        createdAt: c.created_at,
      });
    }

    // 7. Sync applicants from Livelihood applications
    const livRes = await db.query(`SELECT * FROM livelihood_applications ORDER BY id ASC`).catch(() => ({ rows: [] }));
    for (const l of livRes.rows || []) {
      await insertBeneficiaryIfMissing({
        firstName: l.first_name,
        middleName: l.middle_name,
        lastName: l.last_name,
        suffix: l.suffix,
        age: l.age,
        sex: l.gender || l.sex,
        civilStatus: l.civil_status,
        address: l.address,
        contactNo: l.contact_no || l.phone,
        email: l.email,
        qcid: l.qcid,
        createdAt: l.created_at,
      });
    }

    // 8. Sync applicants from Training Program applications
    let trainingList = [];
    try {
      const trRes = await db.query(`SELECT * FROM training_applications ORDER BY id ASC`).catch(() => ({ rows: [] }));
      trainingList = trRes.rows || [];
    } catch {}
    try {
      const trainJsonPath = path.join(__dirname, '../data/training_applications.json');
      if (fs.existsSync(trainJsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(trainJsonPath, 'utf8'));
        if (Array.isArray(parsed)) {
          trainingList = [...trainingList, ...parsed];
        }
      }
    } catch {}

    for (const t of trainingList) {
      const info = t.applicantInfo || (typeof t.applicant_info === 'string' ? JSON.parse(t.applicant_info) : (t.applicant_info || {}));
      await insertBeneficiaryIfMissing({
        firstName: t.first_name || info.firstName,
        middleName: t.middle_name || info.middleName,
        lastName: t.last_name || info.lastName,
        suffix: t.suffix || info.suffix,
        age: t.age || info.age,
        sex: t.gender || t.sex || info.gender || info.sex,
        civilStatus: t.civil_status || info.civilStatus,
        address: t.address || info.address,
        contactNo: t.contact_no || t.phone || info.contactNo || info.phone,
        email: t.email || info.email,
        qcid: t.qcid || t.reference_number || t.referenceNumber || info.qcid,
        createdAt: t.submitted_at || t.submittedAt || t.created_at,
      });
    }
  } catch (err) {
    console.warn('⚠️ Syncing real users to beneficiaries failed:', err.message);
  }
}

function formatProgramStatus(rawStatus) {
  if (!rawStatus) return 'Pending';
  const s = String(rawStatus).toLowerCase().trim();
  if (s.includes('approv') || s === 'approved' || s === 'verified' || s.includes('enrol') || s.includes('complet')) return 'Approved';
  if (s.includes('reject') || s === 'rejected' || s.includes('decline')) return 'Rejected';
  if (s.includes('release') || s === 'for_release') return 'For Release';
  if (s.includes('review') || s === 'under_review') return 'Under Review';
  if (s.includes('evaluat')) return 'Under Evaluation';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

/**
 * Match helper to link an application record with a beneficiary profile
 */
function matchesApplicant(b, app) {
  if (!b || !app) return false;
  let info = {};
  try {
    info = app.applicantInfo || (typeof app.applicant_info === 'string' ? JSON.parse(app.applicant_info) : (app.applicant_info || {}));
  } catch {}
  let formData = {};
  try {
    formData = app.form_data || (typeof app.form_data === 'string' ? JSON.parse(app.form_data) : (app.form_data || {}));
  } catch {}
  let extraData = {};
  try {
    extraData = app.extra_data || (typeof app.extra_data === 'string' ? JSON.parse(app.extra_data) : (app.extra_data || {}));
  } catch {}

  const bQcid = String(b.qcid_number || b.id_number || '').trim().toLowerCase();
  const bEmail = String(b.email || '').trim().toLowerCase();
  const bName = String(b.full_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const bFirst = String(b.first_name || '').trim().toLowerCase();
  const bLast = String(b.last_name || '').trim().toLowerCase();
  const bUserId = b.user_id ? String(b.user_id) : null;
  const bContact = String(b.contact_no || '').replace(/[^0-9]/g, '');

  const appQc = String(
    app.qc_id || app.qcid || app.qcid_number || app.existing_id_number || app.assigned_id_number ||
    app.solo_parent_id_number || info.qcid || formData.qcid || formData.qcidNumber || formData.qcidNo || ''
  ).trim().toLowerCase();

  const appEmail = String(
    app.email || app.guardian_email || info.email || formData.email || extraData.email || ''
  ).trim().toLowerCase();

  const appUserId = app.user_id || app.userId || info.userId || formData.userId || extraData.userId
    ? String(app.user_id || app.userId || info.userId || formData.userId || extraData.userId)
    : null;

  const appFirst = String(
    app.first_name || app.guardian_first_name || info.firstName || formData.firstName || ''
  ).trim().toLowerCase();

  const appMiddle = String(
    app.middle_name || app.guardian_middle_name || info.middleName || formData.middleName || ''
  ).trim().toLowerCase();

  const appLast = String(
    app.last_name || app.guardian_last_name || info.lastName || formData.lastName || ''
  ).trim().toLowerCase();

  const appFullName = String(
    app.full_name || app.applicantName || info.fullName || formData.fullName ||
    [appFirst, appMiddle, appLast].filter(Boolean).join(' ')
  ).trim().toLowerCase().replace(/\s+/g, ' ');

  const appFirstLast = [appFirst, appLast].filter(Boolean).join(' ').replace(/\s+/g, ' ');

  const appContact = String(
    app.contact_no || app.contact_number || app.mobile_number || app.phone ||
    app.guardian_contact_no || info.contactNo || formData.contactNo || ''
  ).replace(/[^0-9]/g, '');

  // 1. User ID match
  if (bUserId && appUserId && bUserId === appUserId) return true;

  // 2. Email match
  if (bEmail && appEmail && bEmail === appEmail) return true;

  // 3. QCID match
  if (bQcid && appQc && bQcid.length >= 5 && appQc.length >= 5) {
    if (bQcid === appQc || bQcid.includes(appQc) || appQc.includes(bQcid)) return true;
  }

  // 4. Contact match (at least 10 digits)
  if (bContact.length >= 10 && appContact.length >= 10 && (bContact.includes(appContact) || appContact.includes(bContact))) {
    return true;
  }

  // 5. Exact first and last name match
  if (bFirst && bLast && appFirst && appLast && bFirst === appFirst && bLast === appLast) return true;

  // 6. Full name match
  if (bName && appFullName && (bName === appFullName || bName.includes(appFullName) || appFullName.includes(bName))) return true;
  if (bName && appFirstLast && (bName === appFirstLast || bName.includes(appFirstLast) || appFirstLast.includes(bName))) return true;
  if (bName && appFirst && appLast && bName.includes(appFirst) && bName.includes(appLast)) return true;

  return false;
}

/**
 * Generate unique Beneficiary Number (e.g. BNF-2026-0001)
 */
async function generateBeneficiaryNumber() {
  const year = new Date().getFullYear();
  try {
    const result = await db.query('SELECT COUNT(*) FROM beneficiaries');
    const count = parseInt(result.rows[0].count, 10) + 1;
    return `BNF-${year}-${String(count).padStart(4, '0')}`;
  } catch {
    const count = memoryBeneficiaries.length + 1;
    return `BNF-${year}-${String(count).padStart(4, '0')}`;
  }
}

/**
 * AUTOMATION HELPER: Ensure a citizen beneficiary record exists and link application
 */
async function ensureBeneficiaryForUser(data) {
  const {
    userId,
    qcid,
    fullName,
    firstName,
    middleName,
    lastName,
    suffix,
    age,
    sex,
    civilStatus,
    birthDate,
    address,
    contactNo,
    email,
    idType,
    idNumber,
    householdMembers,
    program,
    applicationRef,
    action = "Application submitted",
    remarks,
    performedBy,
  } = data;

  const resolvedName = (
    fullName ||
    [firstName, middleName, lastName, suffix].filter(Boolean).join(' ') ||
    'Citizen Beneficiary'
  ).trim().toUpperCase();

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanQcid = (qcid || '').trim();
  const cleanFirst = (firstName || '').trim().toLowerCase();
  const cleanLast = (lastName || '').trim().toLowerCase();
  const parsedUserId = userId && !isNaN(parseInt(userId, 10)) ? parseInt(userId, 10) : null;

  let beneficiary = null;

  try {
    // 1. Check if beneficiary already exists in DB
    const searchConditions = [];
    const searchParams = [];
    let paramIdx = 1;

    if (parsedUserId) {
      searchConditions.push(`user_id = $${paramIdx++}`);
      searchParams.push(parsedUserId);
    }
    if (cleanQcid) {
      searchConditions.push(`qcid_number = $${paramIdx++}`);
      searchParams.push(cleanQcid);
    }
    if (cleanEmail) {
      searchConditions.push(`LOWER(email) = $${paramIdx++}`);
      searchParams.push(cleanEmail);
    }
    if (cleanFirst && cleanLast) {
      searchConditions.push(`(LOWER(first_name) = $${paramIdx} AND LOWER(last_name) = $${paramIdx + 1})`);
      searchParams.push(cleanFirst, cleanLast);
      paramIdx += 2;
    } else if (resolvedName) {
      searchConditions.push(`LOWER(full_name) = $${paramIdx++}`);
      searchParams.push(resolvedName.toLowerCase());
    }

    if (searchConditions.length > 0) {
      const findQuery = `SELECT * FROM beneficiaries WHERE ${searchConditions.join(' OR ')} LIMIT 1`;
      const findRes = await db.query(findQuery, searchParams);
      if (findRes.rows.length > 0) {
        beneficiary = findRes.rows[0];
      }
    }

    // 2. If not found, create new Beneficiary record
    if (!beneficiary) {
      const bnfNumber = await generateBeneficiaryNumber();
      const insertQuery = `
        INSERT INTO beneficiaries (
          user_id, beneficiary_number, full_name, first_name, middle_name, last_name, suffix,
          age, sex, civil_status, birth_date, address, contact_no, email, qcid_number,
          household_members, verification_status, id_type, id_number, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending', $17, $18, NOW(), NOW()
        ) RETURNING *
      `;
      const insertRes = await db.query(insertQuery, [
        parsedUserId,
        bnfNumber,
        resolvedName,
        firstName || null,
        middleName || null,
        lastName || null,
        suffix || null,
        age ? String(age) : null,
        sex || null,
        civilStatus || null,
        birthDate || null,
        address || null,
        contactNo || null,
        email || null,
        cleanQcid || null,
        householdMembers ? String(householdMembers) : '1',
        idType || (cleanQcid ? 'QCitizen ID' : 'Valid ID'),
        idNumber || cleanQcid || null,
      ]);

      beneficiary = insertRes.rows[0];

      // Auto-log Beneficiary Record Creation
      await db.query(
        `INSERT INTO beneficiary_history (beneficiary_id, program, action, performed_by, status, detail, created_at)
         VALUES ($1, 'System', 'Beneficiary Record Created', 'System Automation', 'Active', 'Official beneficiary profile automatically generated.', NOW())`,
        [beneficiary.id]
      ).catch(() => {});
    }

    // 3. Log Application Submission / Linkage Event
    if (beneficiary && program) {
      await db.query(
        `INSERT INTO beneficiary_history (beneficiary_id, application_id, program, action, performed_by, status, detail, remarks, created_at)
         VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7, NOW())`,
        [
          beneficiary.id,
          applicationRef || null,
          program,
          action || 'Application submitted',
          performedBy || resolvedName,
          remarks || `${program} application submitted with Ref: ${applicationRef || 'N/A'}.`,
          remarks || null,
        ]
      ).catch(() => {});
    }

    return beneficiary;
  } catch (err) {
    console.warn('⚠️ Warning in ensureBeneficiaryForUser (DB fallback):', err.message);

    // In-memory fallback
    beneficiary = memoryBeneficiaries.find(
      (b) =>
        (parsedUserId && b.user_id === parsedUserId) ||
        (cleanQcid && b.qcid_number === cleanQcid) ||
        (cleanEmail && b.email?.toLowerCase() === cleanEmail) ||
        (b.full_name?.toLowerCase() === resolvedName.toLowerCase())
    );

    if (!beneficiary) {
      beneficiary = {
        id: memoryBeneficiaries.length + 1,
        user_id: parsedUserId,
        beneficiary_number: `BNF-2026-${String(memoryBeneficiaries.length + 1).padStart(4, '0')}`,
        full_name: resolvedName,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        suffix,
        age: age ? String(age) : "25",
        sex: sex || "Male",
        address: address || "Quezon City",
        contact_no: contactNo || "0915 000 0000",
        email,
        qcid_number: cleanQcid,
        household_members: householdMembers ? String(householdMembers) : "1",
        verification_status: "pending",
        id_type: idType || "Valid ID",
        id_number: idNumber || cleanQcid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryBeneficiaries.push(beneficiary);

      memoryHistory.push({
        id: memoryHistory.length + 1,
        beneficiary_id: beneficiary.id,
        program: 'System',
        action: 'Beneficiary Record Created',
        performed_by: 'System Automation',
        status: 'Active',
        detail: 'Official beneficiary profile automatically generated.',
        created_at: new Date().toISOString(),
      });
    }

    if (program) {
      memoryHistory.push({
        id: memoryHistory.length + 1,
        beneficiary_id: beneficiary.id,
        application_id: applicationRef,
        program,
        action: action || 'Application submitted',
        performed_by: performedBy || resolvedName,
        status: 'Pending',
        detail: remarks || `${program} application submitted with Ref: ${applicationRef || 'N/A'}.`,
        created_at: new Date().toISOString(),
      });
    }

    return beneficiary;
  }
}

/**
 * AUTOMATION HELPER: Log status updates (Approved, Rejected, Released, Scheduled)
 */
async function logBeneficiaryEvent(eventData) {
  const {
    beneficiaryId,
    qcid,
    email,
    name,
    applicationId,
    program,
    action,
    performedBy = "Admin Social Worker",
    status,
    detail,
    remarks,
  } = eventData;

  try {
    let targetBnfId = beneficiaryId;
    if (!targetBnfId) {
      const bnf = await ensureBeneficiaryForUser({ qcid, email, fullName: name, program: null });
      targetBnfId = bnf?.id;
    }

    if (targetBnfId) {
      await db.query(
        `INSERT INTO beneficiary_history (beneficiary_id, application_id, program, action, performed_by, status, detail, remarks, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [targetBnfId, applicationId || null, program || 'General', action, performedBy, status || null, detail || null, remarks || null]
      );
    }
  } catch (err) {
    console.warn('⚠️ Could not record beneficiary history event:', err.message);
  }
}

/**
 * GET /api/beneficiaries
 * Fetch all beneficiaries with aggregated enrolled programs, verification records, and timeline history
 */
async function getAllBeneficiaries(req, res) {
  try {
    // 1. Sync real user accounts and purge obsolete mock accounts
    await syncRealUsersAndApplicantsToBeneficiaries();

    let dbBeneficiaries = [];
    try {
      const bRes = await db.query(`SELECT * FROM beneficiaries ORDER BY id DESC`);
      dbBeneficiaries = bRes.rows;
    } catch {
      dbBeneficiaries = [];
    }

    // Fetch history logs for each beneficiary
    let allHistory = [];
    try {
      const hRes = await db.query(`SELECT * FROM beneficiary_history ORDER BY created_at DESC`);
      allHistory = hRes.rows;
    } catch {
      allHistory = [];
    }

    // Cross-link applications from all service tables
    let aicsList = [], pwdList = [], soloList = [], childList = [], livList = [], trainingList = [];
    try {
      const a = await db.query(`SELECT * FROM aics_applications`).catch(() => ({ rows: [] }));
      aicsList = a.rows;
    } catch {}
    try {
      const p = await db.query(`SELECT * FROM pwd_senior_applications`).catch(() => ({ rows: [] }));
      pwdList = p.rows;
    } catch {}
    try {
      const s = await db.query(`SELECT * FROM solo_parent_applications WHERE module_type = 'SOLO_PARENT' OR module_type IS NULL`).catch(() => ({ rows: [] }));
      soloList = s.rows;
    } catch {}
    try {
      const c = await db.query(`SELECT * FROM solo_parent_applications WHERE module_type = 'CHILD_WELFARE'`).catch(() => ({ rows: [] }));
      childList = c.rows;
    } catch {}
    try {
      const l = await db.query(`SELECT * FROM livelihood_applications`).catch(() => ({ rows: [] }));
      livList = l.rows;
    } catch {}
    try {
      const trRes = await db.query(`SELECT * FROM training_applications`).catch(() => ({ rows: [] }));
      trainingList = trRes.rows || [];
    } catch {}
    try {
      const trainJsonPath = path.join(__dirname, '../data/training_applications.json');
      if (fs.existsSync(trainJsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(trainJsonPath, 'utf8'));
        if (Array.isArray(parsed)) {
          trainingList = [...trainingList, ...parsed];
        }
      }
    } catch {}

    const results = dbBeneficiaries.map((b) => {
      const bId = b.id;
      const bNum = b.beneficiary_number || `BNF-2026-${String(bId).padStart(4, '0')}`;
      const bQcid = (b.qcid_number || '').trim().toLowerCase();
      const bEmail = (b.email || '').trim().toLowerCase();

      const enrolledPrograms = [];

      // 1. Check AICS
      aicsList.forEach((app) => {
        if (matchesApplicant(b, app)) {
          const dateStr = app.submitted_at || app.created_at || new Date().toISOString();
          enrolledPrograms.push({
            program: "AICS",
            assistanceType: app.assistance_type || "Medical Assistance",
            referenceNo: app.reference_no || `AICS-${app.id}`,
            status: formatProgramStatus(app.status),
            dateEnrolled: new Date(dateStr).toISOString().split('T')[0],
            rawTimestamp: new Date(dateStr).getTime(),
          });
        }
      });

      // 2. Check PWD / Senior Citizen
      pwdList.forEach((app) => {
        if (matchesApplicant(b, app)) {
          const progName = (app.category || '').toLowerCase().includes('senior') ? 'Senior Citizen' : 'PWD';
          const typeLabel = app.type || (progName === 'Senior Citizen' ? 'Senior Citizen Assistance' : 'PWD Assistance');
          const dateStr = app.submitted_at || app.created_at || new Date().toISOString();
          enrolledPrograms.push({
            program: progName,
            assistanceType: typeLabel,
            referenceNo: app.assigned_id_number || app.reference_number || app.existing_id_number || `PWD-${app.id}`,
            status: formatProgramStatus(app.status),
            dateEnrolled: new Date(dateStr).toISOString().split('T')[0],
            rawTimestamp: new Date(dateStr).getTime(),
          });
        }
      });

      // 3. Check Solo Parent
      soloList.forEach((app) => {
        if (matchesApplicant(b, app)) {
          let typeLabel = "Solo Parent ID";
          const appType = String(app.application_type || '').toLowerCase();
          if (appType === 'new') typeLabel = "Solo Parent ID (New)";
          else if (appType === 'renewal') typeLabel = "Solo Parent ID (Renewal)";
          else if (appType === 'lost_id' || appType === 'loss' || appType === 'replacement') typeLabel = "Solo Parent ID (Replacement / Lost)";
          else if (app.classification_title) typeLabel = `Solo Parent ID - ${app.classification_title}`;
          else if (app.application_type) typeLabel = `Solo Parent ID (${app.application_type})`;

          const dateStr = app.submitted_at || app.created_at || new Date().toISOString();
          enrolledPrograms.push({
            program: "Solo Parent",
            assistanceType: typeLabel,
            referenceNo: app.assigned_id_number || app.solo_parent_id_number || app.reference_number || `SP-${app.id}`,
            status: formatProgramStatus(app.application_status || app.status),
            dateEnrolled: new Date(dateStr).toISOString().split('T')[0],
            rawTimestamp: new Date(dateStr).getTime(),
          });
        }
      });

      // 4. Check Child Welfare
      childList.forEach((app) => {
        if (matchesApplicant(b, app)) {
          const dateStr = app.submitted_at || app.created_at || new Date().toISOString();
          enrolledPrograms.push({
            program: "Child Welfare",
            assistanceType: app.program_type || "Child Educational Assistance",
            referenceNo: app.reference_number || `CW-${app.id}`,
            status: formatProgramStatus(app.application_status || app.status),
            dateEnrolled: new Date(dateStr).toISOString().split('T')[0],
            rawTimestamp: new Date(dateStr).getTime(),
          });
        }
      });

      // 5. Check Livelihood
      livList.forEach((app) => {
        if (matchesApplicant(b, app)) {
          const dateStr = app.submitted_at || app.created_at || new Date().toISOString();
          enrolledPrograms.push({
            program: "Livelihood",
            assistanceType: app.program_type || app.assistance_type || "Livelihood Grant Assistance",
            referenceNo: app.reference_number || `LP-${app.id}`,
            status: formatProgramStatus(app.application_status || app.status),
            dateEnrolled: new Date(dateStr).toISOString().split('T')[0],
            rawTimestamp: new Date(dateStr).getTime(),
          });
        }
      });

      // 6. Check Training Program
      const trainingSeen = new Set();
      trainingList.forEach((app) => {
        if (matchesApplicant(b, app)) {
          const tKey = app.reference_number || app.referenceNumber || app.id || app.training_name || app.trainingName;
          if (trainingSeen.has(tKey)) return;
          trainingSeen.add(tKey);

          const tName = app.training_name || app.trainingName || "Skills Training Program";
          const dateStr = app.submitted_at || app.submittedAt || app.created_at || new Date().toISOString();

          enrolledPrograms.push({
            program: "Training",
            assistanceType: tName,
            referenceNo: String(app.reference_number || app.referenceNumber || app.qcid || `TR-${app.id}`),
            status: formatProgramStatus(app.status),
            dateEnrolled: new Date(dateStr).toISOString().split('T')[0],
            rawTimestamp: new Date(dateStr).getTime(),
          });
        }
      });

      // Sort enrolled programs with newest first
      enrolledPrograms.sort((a, b) => b.rawTimestamp - a.rawTimestamp);

      // Beneficiary timeline history: combine explicit DB history + automatic application submissions + verification events + profile registration
      const historyList = [];

      // 1. Explicit DB history
      allHistory
        .filter((h) => String(h.beneficiary_id) === String(bId))
        .forEach((h) => {
          historyList.push({
            id: `H-DB-${h.id}`,
            date: new Date(h.created_at || Date.now()).toISOString().split('T')[0],
            rawTimestamp: new Date(h.created_at || Date.now()).getTime(),
            program: h.program || "General",
            action: h.action,
            detail: h.detail || h.remarks || `${h.action} recorded.`,
            performedBy: h.performed_by || "Social Worker",
            status: h.status || "Active",
          });
        });

      // 2. Automatic history from all enrolled programs
      enrolledPrograms.forEach((p, idx) => {
        const actionLabel = String(p.status).toLowerCase().includes('approv') || String(p.status).toLowerCase().includes('release')
          ? `${p.program} Application Approved`
          : String(p.status).toLowerCase().includes('reject')
          ? `${p.program} Application Rejected`
          : `${p.program} Application Submitted`;

        historyList.push({
          id: `H-APP-${bId}-${p.program}-${p.referenceNo || idx}`,
          date: p.dateEnrolled || new Date(b.created_at || Date.now()).toISOString().split('T')[0],
          rawTimestamp: (p.rawTimestamp || new Date(p.dateEnrolled || b.created_at || Date.now()).getTime()) + idx * 100,
          program: p.program,
          action: actionLabel,
          detail: `${p.assistanceType || p.program} application (Ref: ${p.referenceNo || 'N/A'}) status: ${p.status}.`,
          performedBy: b.full_name || "Applicant",
          status: p.status,
        });
      });

      // 3. Verification Event
      if (b.verification_status === 'verified' || b.verified_by) {
        historyList.push({
          id: `H-VERIF-${bId}`,
          date: b.verification_date ? new Date(b.verification_date).toISOString().split('T')[0] : new Date(b.created_at || Date.now()).toISOString().split('T')[0],
          rawTimestamp: new Date(b.verification_date || b.created_at || Date.now()).getTime() + 500,
          program: "General",
          action: "Identity Verified",
          detail: b.verification_remarks || `Beneficiary identity authenticated and verified by ${b.verified_by || 'Social Worker'}.`,
          performedBy: b.verified_by || "Social Worker",
          status: "Verified",
        });
      }

      // 4. Registration Event
      historyList.push({
        id: `H-REG-${bId}`,
        date: new Date(b.created_at || Date.now()).toISOString().split('T')[0],
        rawTimestamp: new Date(b.created_at || Date.now()).getTime(),
        program: "System",
        action: "Beneficiary Profile Registered",
        detail: `Citizen profile officially registered in Quezon City Social Services database with QCID: ${b.qcid_number || 'N/A'}.`,
        performedBy: "System Registration",
        status: "Registered",
      });

      // Sort history chronologically descending (newest first) and remove duplicate event keys
      const historySeen = new Set();
      const history = historyList
        .sort((a, b) => b.rawTimestamp - a.rawTimestamp)
        .filter((item) => {
          const key = `${item.program}_${item.action}_${item.detail}`;
          if (historySeen.has(key)) return false;
          historySeen.add(key);
          return true;
        })
        .map(({ rawTimestamp, ...item }) => item);

      // Resolve Civil Status from beneficiary record or linked application forms
      let resolvedCivilStatus = (b.civil_status && b.civil_status !== '—' && b.civil_status.trim() !== '') ? b.civil_status : null;
      if (!resolvedCivilStatus) {
        const pwdMatch = pwdList.find(app => (bQcid && String(app.reference_number || app.id || '').toLowerCase().includes(bQcid)) || (bEmail && String(app.email || '').toLowerCase() === bEmail));
        if (pwdMatch && pwdMatch.civil_status) resolvedCivilStatus = pwdMatch.civil_status;
      }
      if (!resolvedCivilStatus) {
        const soloMatch = soloList.find(app => (bQcid && String(app.qcid_number || app.reference_number || app.user_id || '').toLowerCase().includes(bQcid)) || (bEmail && String(app.email || '').toLowerCase() === bEmail));
        if (soloMatch) resolvedCivilStatus = soloMatch.civil_status || 'Single Parent';
      }
      if (!resolvedCivilStatus) {
        const aicsMatch = aicsList.find(app => (bQcid && String(app.qc_id || app.reference_no || '').toLowerCase().includes(bQcid)) || (bEmail && String(app.email || '').toLowerCase() === bEmail));
        if (aicsMatch && aicsMatch.civil_status) resolvedCivilStatus = aicsMatch.civil_status;
      }
      if (!resolvedCivilStatus) {
        const livMatch = livList.find(app => (bQcid && String(app.qcid || app.reference_number || app.user_id || '').toLowerCase().includes(bQcid)) || (bEmail && String(app.email || '').toLowerCase() === bEmail));
        if (livMatch && livMatch.civil_status) resolvedCivilStatus = livMatch.civil_status;
      }
      if (!resolvedCivilStatus) {
        resolvedCivilStatus = 'Single';
      }

      // Resolve photo from user profile or application documents (2x2 / ID Photo)
      let resolvedPhotoUrl = b.profile_photo_url || b.photo_url || null;
      if (!resolvedPhotoUrl) {
        const pwdMatch = pwdList.find(app => (bQcid && String(app.reference_number || app.id || '').toLowerCase().includes(bQcid)) || (bEmail && String(app.email || '').toLowerCase() === bEmail));
        if (pwdMatch) {
          const docs = Array.isArray(pwdMatch.documents) ? pwdMatch.documents : (typeof pwdMatch.documents === 'string' ? JSON.parse(pwdMatch.documents || '[]') : []);
          const photoDoc = docs.find(d => {
            const n = String(d.name || d.filename || '').toLowerCase();
            return (n.includes('photo') || n.includes('picture') || n.includes('2x2') || n.includes('1x1') || n.includes('idphoto')) && d.fileUrl;
          });
          if (photoDoc && photoDoc.fileUrl) {
            resolvedPhotoUrl = photoDoc.fileUrl;
          } else {
            const anyImg = docs.find(d => d.fileUrl && String(d.fileUrl).startsWith('data:image'));
            if (anyImg && anyImg.fileUrl) resolvedPhotoUrl = anyImg.fileUrl;
          }
        }
      }
      if (!resolvedPhotoUrl) {
        const soloMatch = soloList.find(app => (bQcid && String(app.qcid_number || app.reference_number || app.user_id || '').toLowerCase().includes(bQcid)) || (bEmail && String(app.email || '').toLowerCase() === bEmail));
        if (soloMatch) {
          const docs = Array.isArray(soloMatch.documents) ? soloMatch.documents : (typeof soloMatch.documents === 'string' ? JSON.parse(soloMatch.documents || '[]') : []);
          const photoDoc = docs.find(d => {
            const n = String(d.name || d.filename || '').toLowerCase();
            return (n.includes('photo') || n.includes('picture') || n.includes('2x2') || n.includes('1x1')) && d.fileUrl;
          });
          if (photoDoc && photoDoc.fileUrl) {
            resolvedPhotoUrl = photoDoc.fileUrl;
          } else {
            const anyImg = docs.find(d => d.fileUrl && String(d.fileUrl).startsWith('data:image'));
            if (anyImg && anyImg.fileUrl) resolvedPhotoUrl = anyImg.fileUrl;
          }
        }
      }

      // Automatic Verification Status derived directly from Module Applications
      let autoVerificationStatus = b.verification_status || 'pending';
      let autoVerifiedBy = b.verified_by || null;
      let autoVerifiedDate = b.verification_date ? new Date(b.verification_date).toISOString().split('T')[0] : null;
      let autoRemarks = b.verification_remarks || null;

      const hasApproved = enrolledPrograms.some((p) => {
        const s = String(p.status || '').toLowerCase();
        return s.includes('approv') || s.includes('release') || s.includes('enroll') || s.includes('claim') || s.includes('active') || s.includes('verif');
      });

      const hasPending = enrolledPrograms.some((p) => {
        const s = String(p.status || '').toLowerCase();
        return s.includes('pend') || s.includes('review') || s.includes('evaluat') || s.includes('submit');
      });

      const hasRejectedOnly = enrolledPrograms.length > 0 && enrolledPrograms.every((p) => {
        const s = String(p.status || '').toLowerCase();
        return s.includes('reject') || s.includes('decline') || s.includes('cancel');
      });

      if (hasApproved || b.verification_status === 'verified') {
        autoVerificationStatus = 'verified';
        autoVerifiedBy = autoVerifiedBy || 'Social Worker Module Approval';
        autoVerifiedDate = autoVerifiedDate || new Date().toISOString().split('T')[0];
        autoRemarks = autoRemarks || 'Verified automatically upon service module application approval.';
      } else if (hasRejectedOnly) {
        autoVerificationStatus = 'unverified';
        autoRemarks = autoRemarks || 'Application did not meet qualification requirements.';
      } else {
        autoVerificationStatus = 'pending';
        autoRemarks = autoRemarks || 'Pending review in program applications.';
      }

      return {
        id: String(b.id),
        beneficiaryNo: bNum,
        fullName: (b.full_name || '').toUpperCase(),
        firstName: b.first_name,
        lastName: b.last_name,
        photoUrl: resolvedPhotoUrl || undefined,
        age: String(b.age || "—"),
        sex: b.sex || "—",
        civilStatus: String(resolvedCivilStatus).toUpperCase(),
        address: b.address || "Quezon City",
        contactNo: b.contact_no || "—",
        email: b.email || "—",
        qcidNumber: b.qcid_number || "—",
        householdMembers: String(b.household_members || "1"),
        dateRegistered: new Date(b.created_at || Date.now()).toISOString().split('T')[0],
        verificationStatus: autoVerificationStatus,
        verifiedBy: autoVerifiedBy || undefined,
        verifiedDate: autoVerifiedDate || undefined,
        verificationRemarks: autoRemarks || undefined,
        idType: b.id_type || (b.qcid_number ? "QCitizen ID" : "Government ID"),
        idNumber: b.id_number || b.qcid_number || undefined,
        enrolledPrograms,
        history,
      };
    });

    res.json({
      success: true,
      count: results.length,
      beneficiaries: results,
    });
  } catch (err) {
    console.error('Error in getAllBeneficiaries:', err);
    res.status(500).json({ error: 'Failed to retrieve beneficiaries', details: err.message });
  }
}

/**
 * GET /api/beneficiaries/:id
 */
async function getBeneficiaryById(req, res) {
  try {
    const { id } = req.params;
    let b = null;
    try {
      const result = await db.query(`SELECT * FROM beneficiaries WHERE id = $1 OR beneficiary_number = $1 LIMIT 1`, [id]);
      if (result.rows.length > 0) b = result.rows[0];
    } catch {}

    if (!b) {
      b = memoryBeneficiaries.find((m) => String(m.id) === String(id) || m.beneficiary_number === id);
    }

    if (!b) {
      return res.status(404).json({ error: 'Beneficiary record not found' });
    }

    res.json({ success: true, beneficiary: b });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve beneficiary', details: err.message });
  }
}

/**
 * PUT /api/beneficiaries/:id/verify
 * Admin action to verify, unverify, or set pending
 */
async function verifyBeneficiary(req, res) {
  try {
    const { id } = req.params;
    const {
      status, // 'verified', 'unverified', 'pending'
      verified_by = "Admin Social Worker",
      remarks = "",
      reason = "",
      id_type,
      id_number,
    } = req.body;

    const validStatuses = ['verified', 'unverified', 'pending'];
    const cleanStatus = String(status || '').toLowerCase().trim();

    if (!validStatuses.includes(cleanStatus)) {
      return res.status(400).json({ error: 'Invalid verification status. Must be verified, unverified, or pending.' });
    }

    const noteText = remarks || reason || `Beneficiary status set to ${cleanStatus}.`;

    let updatedBeneficiary = null;
    const parsedId = !isNaN(parseInt(id, 10)) ? parseInt(id, 10) : -1;

    try {
      const updateQuery = `
        UPDATE beneficiaries
        SET verification_status = $1,
            verified_by = $2,
            verification_date = NOW(),
            verification_remarks = $3,
            id_type = COALESCE($4, id_type),
            id_number = COALESCE($5, id_number),
            updated_at = NOW()
        WHERE id = $6 OR beneficiary_number = $7
        RETURNING *
      `;
      const updateRes = await db.query(updateQuery, [cleanStatus, verified_by, noteText, id_type || null, id_number || null, parsedId, String(id)]);
      if (updateRes.rows.length > 0) {
        updatedBeneficiary = updateRes.rows[0];

        // 1. Record in verification audit table
        await db.query(
          `INSERT INTO beneficiary_verifications (beneficiary_id, status, reviewed_by, reviewed_at, reason, remarks, created_at)
           VALUES ($1, $2, $3, NOW(), $4, $5, NOW())`,
          [updatedBeneficiary.id, cleanStatus, verified_by, reason || null, noteText]
        ).catch(() => {});

        // 2. Record in beneficiary history timeline
        const actionLabel =
          cleanStatus === "verified"
            ? "Beneficiary Verified"
            : cleanStatus === "unverified"
            ? "Beneficiary Flagged Unverified"
            : "Beneficiary Under Review";

        await db.query(
          `INSERT INTO beneficiary_history (beneficiary_id, program, action, performed_by, status, detail, remarks, created_at)
           VALUES ($1, 'Beneficiary Management', $2, $3, $4, $5, $6, NOW())`,
          [updatedBeneficiary.id, actionLabel, verified_by, cleanStatus, noteText, noteText]
        ).catch(() => {});

        // 3. Record in system-wide activity log
        await db.query(
          `INSERT INTO activity_log (actor, actor_role, action, module, reference_no, subject, detail, created_at)
           VALUES ($1, 'Admin', 'VERIFIED_BENEFICIARY', 'Beneficiary Management', $2, $3, $4, NOW())`,
          [verified_by, updatedBeneficiary.beneficiary_number, updatedBeneficiary.full_name, noteText]
        ).catch(() => {});
      }
    } catch (err) {
      console.warn('⚠️ DB update failed, falling back to memory:', err.message);
    }

    if (!updatedBeneficiary) {
      const memIdx = memoryBeneficiaries.findIndex((m) => String(m.id) === String(id) || m.beneficiary_number === id);
      if (memIdx !== -1) {
        memoryBeneficiaries[memIdx].verification_status = cleanStatus;
        memoryBeneficiaries[memIdx].verified_by = verified_by;
        memoryBeneficiaries[memIdx].verification_date = new Date().toISOString();
        memoryBeneficiaries[memIdx].verification_remarks = noteText;
        memoryBeneficiaries[memIdx].updated_at = new Date().toISOString();
        updatedBeneficiary = memoryBeneficiaries[memIdx];

        memoryVerifications.push({
          id: memoryVerifications.length + 1,
          beneficiary_id: updatedBeneficiary.id,
          status: cleanStatus,
          reviewed_by: verified_by,
          reviewed_at: new Date().toISOString(),
          reason: reason || null,
          remarks: noteText,
        });

        memoryHistory.push({
          id: memoryHistory.length + 1,
          beneficiary_id: updatedBeneficiary.id,
          program: 'Beneficiary Management',
          action: cleanStatus === "verified" ? "Beneficiary Verified" : "Verification Status Updated",
          performed_by: verified_by,
          status: cleanStatus,
          detail: noteText,
          created_at: new Date().toISOString(),
        });
      }
    }

    if (!updatedBeneficiary) {
      return res.status(404).json({ error: 'Beneficiary not found to update verification' });
    }

    res.json({
      success: true,
      message: `Beneficiary ${updatedBeneficiary.beneficiary_number} marked as ${cleanStatus}.`,
      beneficiary: updatedBeneficiary,
    });
  } catch (err) {
    console.error('Error in verifyBeneficiary:', err);
    res.status(500).json({ error: 'Failed to verify beneficiary', details: err.message });
  }
}

/**
 * POST /api/beneficiaries/:id/history
 * Add custom case event/log to beneficiary history
 */
async function addBeneficiaryHistory(req, res) {
  try {
    const { id } = req.params;
    const {
      program = "General",
      action,
      performed_by = "Admin Social Worker",
      status = "Active",
      detail = "",
      remarks = "",
      application_id,
    } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required to record history log.' });
    }

    let historyRecord = null;
    try {
      const resLog = await db.query(
        `INSERT INTO beneficiary_history (beneficiary_id, application_id, program, action, performed_by, status, detail, remarks, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
        [id, application_id || null, program, action, performed_by, status, detail, remarks]
      );
      historyRecord = resLog.rows[0];
    } catch {}

    if (!historyRecord) {
      historyRecord = {
        id: memoryHistory.length + 1,
        beneficiary_id: id,
        application_id,
        program,
        action,
        performed_by,
        status,
        detail,
        remarks,
        created_at: new Date().toISOString(),
      };
      memoryHistory.push(historyRecord);
    }

    res.status(201).json({ success: true, history: historyRecord });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add history log', details: err.message });
  }
}

/**
 * DELETE /api/beneficiaries/:id
 */
async function deleteBeneficiary(req, res) {
  try {
    const { id } = req.params;
    try {
      await db.query(`DELETE FROM beneficiaries WHERE id = $1 OR beneficiary_number = $1`, [id]);
    } catch {}
    memoryBeneficiaries = memoryBeneficiaries.filter((m) => String(m.id) !== String(id) && m.beneficiary_number !== id);
    res.json({ success: true, message: `Beneficiary ${id} removed.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete beneficiary', details: err.message });
  }
}

module.exports = {
  ensureBeneficiaryForUser,
  logBeneficiaryEvent,
  getAllBeneficiaries,
  getBeneficiaryById,
  verifyBeneficiary,
  addBeneficiaryHistory,
  deleteBeneficiary,
};
