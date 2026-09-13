const db = require('../config/db');
let logActivity = null;
try {
  const actCtrl = require('./activityLogController');
  logActivity = actCtrl.logActivity;
} catch {}

let sendPwdApprovalEmail = null;
let sendSeniorCitizenApprovalEmail = null;
let sendSeniorBookletApprovalEmail = null;
try {
  const emailService = require('../services/emailService');
  sendPwdApprovalEmail = emailService.sendPwdApprovalEmail;
  sendSeniorCitizenApprovalEmail = emailService.sendSeniorCitizenApprovalEmail;
  sendSeniorBookletApprovalEmail = emailService.sendSeniorBookletApprovalEmail;
} catch {}

// In-memory fallback if database table is initializing or offline
let memoryApplications = [];

// Ensure table exists and has all required columns
async function initPwdSeniorTable() {
  try {
    await db.query(`
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
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS existing_booklet_number VARCHAR(100);
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS reason_for_renewal TEXT;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS reason_for_replacement TEXT;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE pwd_senior_applications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
    `);
    console.log('[DB] pwd_senior_applications table ready.');

    // Remove legacy dummy seed applications if they exist
    await db.query(`
      DELETE FROM pwd_senior_applications 
      WHERE id IN ('APP-PWD-2026-001', 'APP-PWD-2026-002', 'APP-PWD-2026-003') 
         OR reference_number IN ('PWD-QC-2026-4891', 'PWD-QC-2026-3109', 'PWD-QC-2026-5520')
    `);
  } catch (err) {
    console.warn('[DB] Could not initialize pwd_senior_applications table, using fallback memory store:', err.message);
  }
}

initPwdSeniorTable();

/**
 * GET /api/pwd-senior/applications
 * Returns all submitted applications
 */
exports.getAllApplications = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM pwd_senior_applications ORDER BY created_at DESC'
    );
    if (result.rows.length === 0) {
      return res.json([]);
    }
    const mapped = result.rows.map((row) => {
      let parsedDocs = [];
      if (Array.isArray(row.documents)) {
        parsedDocs = row.documents;
      } else if (typeof row.documents === 'string') {
        try {
          parsedDocs = JSON.parse(row.documents);
        } catch {
          parsedDocs = [];
        }
      }
      let extra = {};
      if (row.extra_data && typeof row.extra_data === 'object') {
        extra = row.extra_data;
      } else if (typeof row.extra_data === 'string') {
        try {
          extra = JSON.parse(row.extra_data);
        } catch {}
      }

      const emFirst = row.emergency_first_name || extra.emergencyFirstName || '';
      const emLast = row.emergency_last_name || extra.emergencyLastName || '';
      const emFullName = [emFirst, emLast].filter(Boolean).join(' ').trim();
      const emPerson = row.emergency_contact_person || extra.emergencyContactPerson || extra.emergencyName || emFullName || '';

      return {
        ...extra,
        id: row.id,
        submittedAt: row.submitted_at || row.created_at,
        referenceNumber: row.reference_number,
        category: row.category,
        type: row.type,
        firstName: row.first_name || extra.firstName || '',
        middleName: row.middle_name || extra.middleName || '',
        lastName: row.last_name || extra.lastName || '',
        suffix: row.suffix || extra.suffix || '',
        dateOfBirth: row.date_of_birth || extra.dateOfBirth || '',
        age: row.age || extra.age || '',
        sex: row.sex || extra.sex || '',
        civilStatus: row.civil_status || extra.civilStatus || '',
        contactNo: row.contact_no || extra.contactNo || '',
        cellphoneNo: row.contact_no || extra.cellphoneNo || extra.contactNo || '',
        email: row.email || extra.email || '',
        address: row.address || extra.address || '',
        disabilityType: row.disability_type || extra.disabilityType || '',
        disabilityClass: row.disability_class || extra.disabilityClass || '',
        causeOfDisability: row.cause_of_disability || extra.causeOfDisability || '',
        applyingFor: row.applying_for || extra.applyingFor || 'myself',
        status: row.status || 'pending',
        assignedIdNumber: (() => {
          const raw = row.assigned_id_number || extra.assignedIdNumber || null;
          if (!raw || typeof raw !== 'string') return null;
          const isRowPwd = String(row.category || '').toUpperCase().includes('PWD') || String(row.service || '').toLowerCase().includes('pwd');
          if (isRowPwd) {
            return raw.replace(/^(SENIOR|OSCA)-/i, 'PWD-');
          }
          if (!String(row.type || '').includes('booklet')) {
            return raw.replace(/^PWD-/i, 'SENIOR-');
          }
          return raw;
        })(),
        approvedBy: row.approved_by,
        approvedDate: row.approved_date,
        rejectionReason: row.rejection_reason,
        emergencyFirstName: emFirst,
        emergencyLastName: emLast,
        emergencyContactPerson: emPerson,
        emergencyName: emPerson,
        emergencyContactNo: row.emergency_contact_no || extra.emergencyContactNo || extra.emergencyPhone || '',
        emergencyPhone: row.emergency_contact_no || extra.emergencyContactNo || extra.emergencyPhone || '',
        emergencyRelationship: row.emergency_relationship || extra.emergencyRelationship || extra.relationshipToApplicant || '',
        relationshipToApplicant: row.emergency_relationship || extra.emergencyRelationship || extra.relationshipToApplicant || '',
        emergencyAddress: row.emergency_address || extra.emergencyAddress || '',
        emergencyResidentialAddress: row.emergency_residential_address || row.emergency_address || extra.emergencyResidentialAddress || extra.emergencyAddress || '',
        houseNo: row.house_no || extra.houseNo || extra.addressHouseNo || '',
        street: row.street || extra.street || extra.addressStreet || '',
        barangay: row.barangay || extra.barangay || extra.addressBarangay || '',
        city: row.city || extra.city || extra.addressCity || '',
        bloodType: row.blood_type || extra.bloodType || '',
        nationality: row.nationality || extra.nationality || '',
        existingIdNumber: row.existing_id_number || extra.existingIdNumber || '',
        existingBookletNumber: row.existing_booklet_number || extra.existingBookletNumber || extra.bookletNumber || '',
        reasonForRenewal: row.reason_for_renewal || extra.reasonForRenewal || '',
        reasonForReplacement: row.reason_for_replacement || extra.reasonForReplacement || '',
        pobCity: extra.pobCity || extra.placeOfBirthCity || '',
        pobProvince: extra.pobProvince || extra.placeOfBirthProvince || '',
        heightCm: extra.heightCm || '',
        weightKg: extra.weightKg || '',
        colorOfHair: extra.colorOfHair || '',
        colorOfEyes: extra.colorOfEyes || '',
        otherMarks: extra.otherMarks || extra.otherIdentifyingMarks || '',
        specificDisability: extra.specificDisability || '',
        permanentAddress: extra.permanentAddress || '',
        presentAddress: extra.presentAddress || '',
        disabilityDescription: extra.disabilityDescription || extra.briefDescription || extra.description || '',
        briefDescription: extra.disabilityDescription || extra.briefDescription || extra.description || '',
        householdMembersCount: extra.householdMembersCount || extra.householdMembers || extra.numberOfHouseholdMembers || '',
        householdMembers: extra.householdMembers || extra.householdMembersCount || extra.numberOfHouseholdMembers || '',
        numberOfHouseholdMembers: extra.numberOfHouseholdMembers || extra.householdMembers || extra.householdMembersCount || '',
        monthlyHouseholdIncome: extra.monthlyHouseholdIncome || extra.monthlyIncome || '',
        monthlyHouseholdExpenses: extra.monthlyHouseholdExpenses || extra.monthlyExpenses || '',
        assistanceType: extra.assistanceType || row.type || '',
        reasonForRequest: extra.reasonForRequest || '',
        livingArrangement: extra.livingArrangement || '',
        pensionSource: extra.pensionSource || '',
        documents: parsedDocs.length > 0 ? parsedDocs : (extra.documents || []),
        applicantPhoto: extra.applicantPhoto || extra.photoUrl || row.applicant_photo || (() => {
          const p = parsedDocs.find((d) => /2x2|photo|picture|id_pic|avatar/i.test(d.name || d.filename || ''));
          return p ? (p.dataUrl || p.fileUrl || p.previewUrl || '') : '';
        })(),
        photoUrl: extra.photoUrl || extra.applicantPhoto || row.photo_url || row.applicant_photo || (() => {
          const p = parsedDocs.find((d) => /2x2|photo|picture|id_pic|avatar/i.test(d.name || d.filename || ''));
          return p ? (p.dataUrl || p.fileUrl || p.previewUrl || '') : '';
        })(),
        isArchived: row.is_archived || false,
      };
    });
    return res.json(mapped);
  } catch (err) {
    console.warn('[DB Error] Fetching from DB failed, returning in-memory:', err.message);
    return res.json(memoryApplications);
  }
};

/**
 * POST /api/pwd-senior/applications
 * Submits a new PWD or Senior Citizen application
 */
exports.createApplication = async (req, res) => {
  try {
    const body = req.body;
    const appId = body.id || `APP-${Date.now()}`;
    const refNum = body.referenceNumber || '110000116932100';

    const emFirst = body.emergencyFirstName || '';
    const emLast = body.emergencyLastName || '';
    const emPerson = body.emergencyContactPerson || body.emergencyName || [emFirst, emLast].filter(Boolean).join(' ').trim();
    const emPhone = body.emergencyContactNo || body.emergencyPhone || '';
    const emRel = body.emergencyRelationship || body.relationshipToApplicant || '';
    const emAddr = body.emergencyAddress || body.emergencyResidentialAddress || '';

    const photoDoc = (body.documents || []).find((d) => /2x2|photo|picture|id_pic|avatar/i.test(d.name || d.filename || ''));
    const resolvedPhoto = body.applicantPhoto || body.photoUrl || (photoDoc ? (photoDoc.dataUrl || photoDoc.fileUrl || photoDoc.previewUrl) : '') || '';

    const newApp = {
      ...body,
      id: appId,
      submittedAt: body.submittedAt || new Date().toISOString(),
      referenceNumber: refNum,
      category: body.category || 'PWD',
      type: body.type || 'new',
      applicantPhoto: resolvedPhoto,
      photoUrl: resolvedPhoto,
      firstName: body.firstName || '',
      middleName: body.middleName || '',
      lastName: body.lastName || '',
      suffix: body.suffix || '',
      dateOfBirth: body.dateOfBirth || '',
      age: body.age || '',
      sex: body.sex || '',
      civilStatus: body.civilStatus || '',
      contactNo: body.contactNo || body.cellphoneNo || '',
      cellphoneNo: body.contactNo || body.cellphoneNo || '',
      email: body.email || '',
      address: body.address || '',
      disabilityType: body.disabilityType || '',
      disabilityClass: body.disabilityClass || '',
      causeOfDisability: body.causeOfDisability || '',
      applyingFor: body.applyingFor || 'myself',
      documents: body.documents || [],
      status: 'pending',
      assignedIdNumber: body.assignedIdNumber || null,
      approvedBy: null,
      approvedDate: null,
      rejectionReason: null,
      emergencyFirstName: emFirst,
      emergencyLastName: emLast,
      emergencyContactPerson: emPerson,
      emergencyName: emPerson,
      emergencyContactNo: emPhone,
      emergencyPhone: emPhone,
      emergencyRelationship: emRel,
      relationshipToApplicant: emRel,
      emergencyAddress: emAddr,
      emergencyResidentialAddress: emAddr,
      houseNo: body.houseNo || '',
      street: body.street || '',
      barangay: body.barangay || '',
      city: body.city || '',
      bloodType: body.bloodType || '',
      nationality: body.nationality || '',
      existingIdNumber: body.existingIdNumber || '',
      existingBookletNumber: body.existingBookletNumber || body.bookletNumber || '',
      reasonForRenewal: body.reasonForRenewal || '',
      reasonForReplacement: body.reasonForReplacement || '',
    };

    try {
      await db.query(
        `DELETE FROM pwd_senior_applications WHERE (reference_number = $1 OR email = $2) AND category = $3 AND status = 'rejected'`,
        [newApp.referenceNumber, newApp.email, newApp.category]
      );
      await db.query(
        `INSERT INTO pwd_senior_applications (
          id, reference_number, category, type, first_name, middle_name, last_name, suffix,
          date_of_birth, age, sex, civil_status, contact_no, email, address, disability_type,
          disability_class, cause_of_disability, applying_for, documents, status,
          emergency_first_name, emergency_last_name, emergency_contact_person, emergency_contact_no,
          emergency_relationship, emergency_address, emergency_residential_address,
          house_no, street, barangay, city, blood_type, nationality, existing_id_number,
          existing_booklet_number, reason_for_renewal, reason_for_replacement, extra_data
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39
        )`,
        [
          newApp.id,
          newApp.referenceNumber,
          newApp.category,
          newApp.type,
          newApp.firstName,
          newApp.middleName,
          newApp.lastName,
          newApp.suffix,
          newApp.dateOfBirth,
          newApp.age,
          newApp.sex,
          newApp.civilStatus,
          newApp.contactNo,
          newApp.email,
          newApp.address,
          newApp.disabilityType,
          newApp.disabilityClass,
          newApp.causeOfDisability,
          newApp.applyingFor,
          JSON.stringify(newApp.documents),
          'pending',
          newApp.emergencyFirstName,
          newApp.emergencyLastName,
          newApp.emergencyContactPerson,
          newApp.emergencyContactNo,
          newApp.emergencyRelationship,
          newApp.emergencyAddress,
          newApp.emergencyResidentialAddress,
          newApp.houseNo,
          newApp.street,
          newApp.barangay,
          newApp.city,
          newApp.bloodType,
          newApp.nationality,
          newApp.existingIdNumber,
          newApp.existingBookletNumber,
          newApp.reasonForRenewal,
          newApp.reasonForReplacement,
          JSON.stringify(body),
        ]
      );
    } catch (dbErr) {
      console.warn('[DB Error] Could not insert to DB, saving to memory fallback:', dbErr.message);
      memoryApplications = [
        newApp,
        ...memoryApplications.filter(
          (a) =>
            !(
              (a.referenceNumber === newApp.referenceNumber || a.email === newApp.email) &&
              a.category === newApp.category &&
              a.status === 'rejected'
            )
        ),
      ];
    }

    if (logActivity) {
      logActivity({
        actor: `${newApp.firstName} ${newApp.lastName}`.trim() || 'Resident',
        actorRole: 'Citizen',
        action: 'created',
        module: 'PWD & Senior Citizen',
        referenceNo: newApp.referenceNumber,
        subject: `${newApp.category} ${newApp.type.toUpperCase()} Application Submitted`,
        detail: `Application submitted for ${newApp.category} (${newApp.type})`,
      });
    }

    try {
      const { ensureBeneficiaryForUser } = require('./beneficiaryController');
      const progName = (newApp.category || '').toLowerCase().includes('senior') ? 'Senior Citizen' : 'PWD';
      ensureBeneficiaryForUser({
        qcid: newApp.referenceNumber,
        fullName: `${newApp.firstName} ${newApp.lastName}`.trim(),
        firstName: newApp.firstName,
        middleName: newApp.middleName,
        lastName: newApp.lastName,
        suffix: newApp.suffix,
        age: newApp.age,
        sex: newApp.sex,
        civilStatus: newApp.civilStatus,
        birthDate: newApp.dateOfBirth,
        address: newApp.address || `${newApp.houseNo || ''} ${newApp.street || ''} ${newApp.barangay || ''}`.trim(),
        contactNo: newApp.contactNo || newApp.cellphoneNo,
        email: newApp.email,
        idType: newApp.existingIdNumber ? `${progName} ID` : 'Valid ID',
        idNumber: newApp.existingIdNumber || newApp.referenceNumber,
        program: progName,
        applicationRef: newApp.referenceNumber,
        action: 'Application submitted',
        remarks: `${progName} (${newApp.type}) application submitted.`,
        performedBy: `${newApp.firstName} ${newApp.lastName}`.trim(),
      }).catch(() => {});
    } catch {}

    return res.status(201).json({ success: true, application: newApp });
  } catch (err) {
    console.error('Error creating PWD/Senior application:', err);
    return res.status(500).json({ error: 'Failed to create application', details: err.message });
  }
};

/**
 * PATCH /api/pwd-senior/applications/:id/status
 * Updates status (approve / reject)
 */
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status, assignedIdNumber, approvedBy, approvedDate, rejectionReason, referenceNumber } = req.body;
    const lookupRef = referenceNumber || id;

    let targetApp = null;
    try {
      const q = await db.query(
        `SELECT * FROM pwd_senior_applications WHERE reference_number = $1 OR reference_number = $2 OR id::text = $1 OR id::text = $2`,
        [id, lookupRef]
      );
      if (q.rows.length > 0) {
        targetApp = q.rows[0];
      }
    } catch (_) {}

    if (!targetApp) {
      targetApp = memoryApplications.find((a) => a.id === id || a.referenceNumber === id || a.reference_number === id || a.referenceNumber === lookupRef || a.reference_number === lookupRef);
    }

    const refNo = targetApp?.reference_number || targetApp?.referenceNumber || lookupRef || id;
    const fullName = targetApp ? [
      targetApp.first_name || targetApp.firstName,
      targetApp.middle_name || targetApp.middleName,
      targetApp.last_name || targetApp.lastName,
      targetApp.suffix
    ].filter(Boolean).join(' ').trim().toUpperCase() : 'BENEFICIARY';
    const isPwd = String(targetApp?.category || '').toUpperCase().includes('PWD');
    const appType = String(targetApp?.type || '').toLowerCase();
    const isAssistance = appType === 'assistance' || appType === 'social-assistance' || String(targetApp?.category || '').toLowerCase().includes('assistance') || String(targetApp?.service || '').toLowerCase().includes('assistance') || String(targetApp?.disability_class || '').toLowerCase().includes('assistance') || String(targetApp?.disabilityClass || '').toLowerCase().includes('assistance');
    const isSeniorBooklet = !isPwd && (
      appType === 'medicine-booklet' ||
      appType === 'movie-booklet' ||
      String(targetApp?.type || '').toLowerCase().includes('booklet') ||
      String(targetApp?.category || '').toLowerCase().includes('booklet')
    );
    const isMovieBooklet = isSeniorBooklet && (
      appType === 'movie-booklet' ||
      String(targetApp?.type || '').toLowerCase().includes('movie')
    );

    // Correct ID prefix based on category
    if (status === 'approved') {
      if (isPwd) {
        if (assignedIdNumber) {
          assignedIdNumber = assignedIdNumber.replace(/^(SENIOR|OSCA)-/i, 'PWD-');
          if (!assignedIdNumber.startsWith('PWD-')) {
            assignedIdNumber = `PWD-${assignedIdNumber}`;
          }
        } else {
          const year = new Date().getFullYear();
          const randomSeq = String(Math.floor(100000 + Math.random() * 900000));
          assignedIdNumber = `PWD-137404-${year}-${randomSeq}`;
        }
      } else if (isSeniorBooklet) {
        if (!assignedIdNumber || (!assignedIdNumber.startsWith('137404-') && !assignedIdNumber.startsWith('MB-') && !assignedIdNumber.startsWith('MV-'))) {
          const year = new Date().getFullYear();
          const randomSeq = String(Math.floor(100000 + Math.random() * 900000));
          assignedIdNumber = `137404-${year}-${randomSeq}`;
        }
      } else {
        // Senior Citizen ID
        if (assignedIdNumber) {
          assignedIdNumber = assignedIdNumber.replace(/^(PWD|OSCA)-/i, 'SENIOR-');
          if (!assignedIdNumber.startsWith('SENIOR-')) {
            assignedIdNumber = `SENIOR-${assignedIdNumber}`;
          }
        } else {
          const year = new Date().getFullYear();
          const randomSeq = String(Math.floor(100000 + Math.random() * 900000));
          assignedIdNumber = `SENIOR-137404-${year}-${randomSeq}`;
        }
      }
    }

    try {
      const q = await db.query(
        `UPDATE pwd_senior_applications
         SET status = $1, assigned_id_number = $2, approved_by = $3, approved_date = $4, rejection_reason = $5
         WHERE reference_number = $6 OR reference_number = $7 OR id::text = $6 OR id::text = $7
         RETURNING *`,
        [status, assignedIdNumber || null, approvedBy || null, approvedDate || null, rejectionReason || null, id, refNo]
      );
      if (q.rows.length > 0) {
        targetApp = q.rows[0];
      }
    } catch (dbErr) {
      console.warn('[DB Error] Updating DB failed, updating in memory fallback:', dbErr.message);
      memoryApplications = memoryApplications.map((app) => {
        if (app.id === id || app.referenceNumber === id || app.reference_number === id || app.referenceNumber === refNo || app.reference_number === refNo) {
          const updated = {
            ...app,
            status,
            assignedIdNumber: assignedIdNumber || app.assignedIdNumber,
            approvedBy: approvedBy || app.approvedBy,
            approvedDate: approvedDate || app.approvedDate,
            rejectionReason: rejectionReason || app.rejectionReason,
          };
          targetApp = updated;
          return updated;
        }
        return app;
      });
    }

    if (status === 'approved') {
      if (isAssistance) {
        const concernName = isPwd ? 'PWD Social Assistance' : 'Senior Social Assistance';

        // 1. Insert into appointments only for Social Assistance
        try {
          const checkAppt = await db.query('SELECT id FROM appointments WHERE reference_no = $1', [refNo]);
          if (checkAppt.rows.length === 0) {
            await db.query(
              `INSERT INTO appointments
                (reference_no, module, applicant_name, concern, status, office_location, notes)
               VALUES ($1, $2, $3, $4, 'pending', 'Quezon City Hall', 'Awtomatikong pumasok mula sa na-aprubahang PWD/Senior Social Assistance aplikasyon para sa scheduling.')
               ON CONFLICT DO NOTHING`,
              [refNo, isPwd ? 'PWD' : 'Senior Citizen', fullName, concernName]
            );
          }
        } catch (e) {
          console.warn('Could not insert appointment for PWD/Senior:', e.message);
        }

        // 2. Insert into financial_aid_disbursements if social assistance
        try {
          const disbCheck = await db.query('SELECT id FROM financial_aid_disbursements WHERE application_ref = $1', [refNo]);
          if (disbCheck.rows.length === 0) {
            const disbId = `DISB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
            await db.query(
              `INSERT INTO financial_aid_disbursements (
                disbursement_id, application_ref, applicant_name, assistance_type, fixed_amount,
                date_approved, status, venue, remarks
              ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
              ON CONFLICT DO NOTHING`,
              [
                disbId,
                refNo,
                fullName,
                concernName,
                2000,
                approvedDate || new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
                'Quezon City Hall',
                'Awtomatikong pumasok mula sa PWD/Senior Social Assistance aplikasyon.',
              ]
            );
          }
        } catch (e) {
          console.warn('Could not insert financial disbursement for PWD/Senior:', e.message);
        }
      } else {
        // For ID / Booklet card issuance, remove any existing appointment or disbursement
        try {
          await db.query(`DELETE FROM appointments WHERE reference_no = $1`, [refNo]);
          await db.query(`DELETE FROM financial_aid_disbursements WHERE application_ref = $1`, [refNo]);
        } catch (_) {}
      }

      // 3. Directly dispatch generated Official ID / Booklet Email to Gmail
      const targetEmail = targetApp?.email || targetApp?.contact_email;
      if (targetEmail && targetEmail.includes('@')) {
        if (isSeniorBooklet) {
          // Senior Citizen Booklet (Medicine / Movie)
          if (sendSeniorBookletApprovalEmail) {
            sendSeniorBookletApprovalEmail({
              recipientEmail: targetEmail,
              recipientName: fullName,
              bookletNumber: assignedIdNumber,
              oscaIdNumber: targetApp?.existing_id_number || targetApp?.existingIdNumber || targetApp?.reference_number || targetApp?.referenceNumber,
              referenceNumber: refNo,
              bookletType: isMovieBooklet ? 'movie' : 'medicine',
              applicationType: appType === 'renewal' ? 'Renewal' : appType === 'replacement' || appType === 'loss' ? 'Replacement' : 'New Booklet',
              approvedDate: approvedDate || new Date().toISOString(),
              contactNumber: targetApp?.contact_no || targetApp?.contactNo || targetApp?.cellphoneNo,
              address: targetApp?.address,
            }).catch((err) => console.warn('[Email Error] Failed to send Senior Booklet approval email:', err.message));
          }
        } else if (!isPwd) {
          // Senior Citizen ID
          if (sendSeniorCitizenApprovalEmail) {
            sendSeniorCitizenApprovalEmail({
              recipientEmail: targetEmail,
              recipientName: fullName,
              seniorIdNumber: assignedIdNumber || refNo,
              referenceNumber: refNo,
              applicationType: appType === 'renewal' ? 'Senior ID Renewal' : appType === 'loss' || appType === 'replacement' ? 'Replacement / Lost ID' : 'New Application',
              bloodType: targetApp?.blood_type || targetApp?.bloodType || 'O+',
              approvedDate: approvedDate || new Date().toISOString(),
              contactNumber: targetApp?.contact_no || targetApp?.contactNo || targetApp?.cellphoneNo,
              address: targetApp?.address,
            }).catch((err) => console.warn('[Email Error] Failed to send Senior Citizen approval email:', err.message));
          }
        } else {
          // PWD ID
          if (sendPwdApprovalEmail) {
            sendPwdApprovalEmail({
              recipientEmail: targetEmail,
              recipientName: fullName,
              pwdIdNumber: assignedIdNumber || refNo,
              referenceNumber: refNo,
              disabilityType: targetApp?.disability_type || targetApp?.disabilityType || 'Physical / Visual Disability',
              bloodType: targetApp?.blood_type || targetApp?.bloodType || 'O+',
              approvedDate: approvedDate || new Date().toISOString(),
              contactNumber: targetApp?.contact_no || targetApp?.contactNo || targetApp?.cellphoneNo,
              address: targetApp?.address,
            }).catch((err) => console.warn('[Email Error] Failed to send PWD approval email:', err.message));
          }
        }
      }
    } else if (status === 'rejected') {
      try {
        await db.query(`DELETE FROM appointments WHERE reference_no = $1`, [refNo]);
        await db.query(`DELETE FROM financial_aid_disbursements WHERE application_ref = $1`, [refNo]);
      } catch (_) {}
    }

    if (logActivity) {
      logActivity({
        actor: approvedBy || 'Social Worker Admin',
        actorRole: 'Social Worker',
        action: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'edited',
        module: 'PWD & Senior Citizen',
        referenceNo: assignedIdNumber || refNo,
        subject: `${status === 'approved' ? 'Approved' : 'Rejected'} PWD/Senior Application`,
        detail: status === 'approved' ? (isSeniorBooklet ? `Official Booklet: ${assignedIdNumber}` : `Official ID: ${assignedIdNumber || 'Assigned'}`) : (rejectionReason || 'Requirements not met'),
      });
    }

    return res.json({ success: true, id, status, assignedIdNumber, referenceNumber: refNo });
  } catch (err) {
    console.error('Error updating status:', err);
    return res.status(500).json({ error: 'Failed to update status', details: err.message });
  }
};

// Delete single application
exports.deleteApplication = async (req, res) => {
  const { id } = req.params;
  try {
    // Delete from DB
    await db.query(`DELETE FROM pwd_senior_applications WHERE id = $1 OR reference_number = $1`, [id]);
    
    // Also remove from memoryApplications
    memoryApplications = memoryApplications.filter(app => app.id !== id && app.referenceNumber !== id);

    return res.json({ success: true, message: `Application ${id} deleted successfully` });
  } catch (err) {
    console.error('Error deleting application:', err);
    return res.status(500).json({ error: 'Failed to delete application', details: err.message });
  }
};

// Clear/Delete all Senior Citizen applications (for fresh testing)
exports.clearSeniorApplications = async (req, res) => {
  try {
    await db.query(`DELETE FROM pwd_senior_applications WHERE category ILIKE '%senior%' OR category = 'Senior Citizen'`);
    memoryApplications = memoryApplications.filter(app => !app.category || !app.category.toLowerCase().includes('senior'));

    return res.json({ success: true, message: 'All Senior Citizen applications cleared for fresh testing' });
  } catch (err) {
    console.error('Error clearing senior applications:', err);
    return res.status(500).json({ error: 'Failed to clear senior applications', details: err.message });
  }
};

// Clear/Delete by user name or reference number
exports.cleanupUserPwdSenior = async (req, res) => {
  const { nameOrRef } = req.params;
  try {
    const term = `%${nameOrRef}%`;
    const result = await db.query(
      `DELETE FROM pwd_senior_applications 
       WHERE LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
          OR LOWER(first_name || ' ' || middle_name || ' ' || last_name) LIKE LOWER($1)
          OR reference_number LIKE $1`,
      [term]
    );

    memoryApplications = memoryApplications.filter(
      app =>
        !String(app.referenceNumber || '').includes(nameOrRef) &&
        !String(app.reference_number || '').includes(nameOrRef) &&
        !String(app.firstName || app.first_name || '').toLowerCase().includes(nameOrRef.toLowerCase())
    );

    return res.json({ success: true, message: `Deleted ${result.rowCount} PWD/Senior applications for ${nameOrRef}` });
  } catch (err) {
    console.error('Error clearing user PWD/Senior applications:', err);
    return res.status(500).json({ error: 'Failed to clear user PWD/Senior applications', details: err.message });
  }
};
