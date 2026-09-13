// controllers/childWelfareController.js
const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

function generateReference(qcid) {
  if (qcid && String(qcid).trim()) return String(qcid).trim();
  return '110000116932100';
}

async function getUniqueReferenceNumber(baseRef) {
  let clean = String(baseRef || '').trim() || generateReference();
  let candidate = clean;
  let attempt = 0;
  while (true) {
    const existing = await db.query('SELECT id FROM child_welfare_applications WHERE reference_number = $1', [candidate]);
    if (existing.rows.length === 0) {
      return candidate;
    }
    attempt++;
    candidate = `${clean}-${attempt}`;
  }
}

async function initChildWelfareColumns() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS child_welfare_applications (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(100) UNIQUE NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        application_status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS approved_amount VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS category_id VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS category_title VARCHAR(255);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS required_document_ids JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_first_name VARCHAR(150);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_middle_name VARCHAR(150);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_last_name VARCHAR(150);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_sex VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_date_of_birth VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_age INTEGER;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_civil_status VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_relationship_to_child VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_contact_no VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(150);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS guardian_valid_id VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS address_house_no VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS address_barangay VARCHAR(255);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS address_city_municipality VARCHAR(255);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_name VARCHAR(255);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_sex VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_birthday VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_age INTEGER;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_school_daycare VARCHAR(255);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_birth_certificate VARCHAR(255);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_grade_level VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_school_address TEXT;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_enrollment_status VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_special_needs VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_special_needs_specify TEXT;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS household_members VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS children_studying VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS monthly_household_income VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS main_source_income VARCHAR(255);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS employment_status VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS other_financial_support TEXT;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS support_types JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS support_other TEXT;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS primary_reason_for_assistance TEXT;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS specific_needs TEXT;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS estimated_amount_needed VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS urgency VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS child_living_arrangement VARCHAR(100);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS other_children_needing_assistance VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS other_children_count VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS other_govt_assistance_received VARCHAR(50);
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS other_govt_program TEXT;
      ALTER TABLE child_welfare_applications ADD COLUMN IF NOT EXISTS additional_info TEXT;
    `);
  } catch (e) {
    console.warn('[Child Welfare DB init columns]:', e.message);
  }
}
initChildWelfareColumns();

// Create new application
exports.createApplication = async (req, res) => {
  try {
    const { userId, applicationData, requiredDocumentIds } = req.body;
    const { isResident, selectedCategoryId, selectedCategory, formData = {} } = applicationData || {};

    // Clean up any unsubmitted draft records so they never block new attempts
    if (userId && String(userId) !== '0') {
      await db.query(
        `DELETE FROM child_welfare_applications WHERE user_id = $1 AND application_status = 'draft'`,
        [String(userId)]
      ).catch(() => {});
    }

    const baseRef = req.body.referenceNumber || req.body.reference_number || (formData && (formData.qcidNumber || formData.qcidNo || formData.qcId)) || generateReference();
    const referenceNumber = await getUniqueReferenceNumber(baseRef);

    const guardianFirstName = formData.guardianFirstName || formData.parentFullName || '';
    const guardianMiddleName = formData.guardianMiddleName || '';
    const guardianLastName = formData.guardianLastName || '';
    const guardianSex = formData.guardianSex || '';
    const guardianDateOfBirth = formData.guardianDateOfBirth || '';
    const guardianAge = formData.guardianAge ? parseInt(formData.guardianAge, 10) : null;
    const guardianCivilStatus = formData.guardianCivilStatus || '';
    const guardianRelationship = formData.guardianRelationshipToChild || formData.parentRelationship || '';
    const guardianContactNo = formData.guardianContactNo || formData.parentContactNo || formData.contactNo || '';
    const guardianEmail = formData.guardianEmail || formData.email || '';
    const guardianValidId = formData.guardianValidId || '';

    const addressHouseNo = formData.addressHouseNo || formData.houseNo || '';
    const addressStreet = formData.addressStreet || formData.street || '';
    const addressBarangay = formData.addressBarangay || formData.barangay || '';
    const addressCity = formData.addressCityMunicipality || formData.city || 'Quezon City';

    const childName = formData.childName || [formData.firstName, formData.middleName, formData.lastName, formData.suffix].filter(Boolean).join(' ');
    const childSex = formData.childSex || formData.sex || '';
    const childBirthday = formData.childBirthday || (formData.dobMonth && formData.dobDay && formData.dobYear ? `${formData.dobMonth}/${formData.dobDay}/${formData.dobYear}` : '');
    const childAge = formData.childAge || formData.age ? parseInt(formData.childAge || formData.age, 10) : null;
    const childSchoolDaycare = formData.childSchoolDaycare || '';
    const childBirthCertificate = formData.childBirthCertificate || '';
    const childGradeLevel = formData.childGradeLevel || '';
    const childSchoolAddress = formData.childSchoolAddress || '';
    const childEnrollmentStatus = formData.childEnrollmentStatus || '';
    const childSpecialNeeds = formData.childSpecialNeeds || '';
    const childSpecialNeedsSpecify = formData.childSpecialNeedsSpecify || '';

    const householdMembers = formData.householdMembers || '';
    const childrenStudying = formData.childrenStudying || '';
    const monthlyHouseholdIncome = formData.monthlyHouseholdIncome || '';
    const mainSourceIncome = formData.mainSourceIncome || '';
    const employmentStatus = formData.employmentStatus || '';
    const otherFinancialSupport = formData.otherFinancialSupport || '';

    const supportTypes = formData.supportTypes || (applicationData?.selectedAssistanceType ? [applicationData.selectedAssistanceType] : []);
    const supportOther = formData.supportOther || '';

    const primaryReason = formData.primaryReasonForAssistance || formData.reasonForRequest || formData.emergencyType || '';
    const specificNeeds = formData.specificNeeds || formData.briefDescription || '';
    const estimatedAmountNeeded = formData.estimatedAmountNeeded || '';
    const urgency = formData.urgency || (formData.reportEmergencyPriority ? 'HIGH PRIORITY' : 'Normal');

    const childLivingArrangement = formData.childLivingArrangement || formData.currentLivingSituation || '';
    const otherChildrenNeedingAssistance = formData.otherChildrenNeedingAssistance || '';
    const otherChildrenCount = formData.otherChildrenCount || '';
    const otherGovtAssistanceReceived = formData.otherGovtAssistanceReceived || '';
    const otherGovtProgram = formData.otherGovtProgram || '';
    const safetyInfo = [
      formData.isImmediateDanger ? `Immediate Danger: ${formData.isImmediateDanger}` : '',
      formData.isChildSafe ? `Child Currently in Safe Location: ${formData.isChildSafe}` : '',
      formData.isReportingPersonCurrentParent ? `Reporting Person is Current Parent/Guardian: ${formData.isReportingPersonCurrentParent}${formData.isReportingPersonCurrentParent === 'No' && formData.specifiedRelationship ? ` (Specified: ${formData.specifiedRelationship})` : ''}` : ''
    ].filter(Boolean).join(' | ');

    const additionalInfo = [formData.additionalInfo, safetyInfo].filter(Boolean).join('\n');

    const categoryTitle = selectedCategory?.title || applicationData?.programTitle || 'Child Welfare Assistance';
    const categoryId = selectedCategoryId || (selectedCategory?.id ? String(selectedCategory.id) : null);

    const initialStatus = applicationData?.status || applicationData?.application_status || 'pending';
    const initialDocs = applicationData?.documents || req.body.documents || applicationData?.uploadedDocuments || [];

    const result = await db.query(
      `INSERT INTO child_welfare_applications (
        reference_number, user_id, application_status, category_id, category_title, required_document_ids,
        guardian_first_name, guardian_middle_name, guardian_last_name, guardian_sex, guardian_date_of_birth,
        guardian_age, guardian_civil_status, guardian_relationship_to_child, guardian_contact_no,
        guardian_email, guardian_valid_id,
        address_house_no, address_street, address_barangay, address_city_municipality,
        child_name, child_sex, child_birthday, child_age, child_school_daycare, child_birth_certificate,
        child_grade_level, child_school_address, child_enrollment_status, child_special_needs, child_special_needs_specify,
        household_members, children_studying, monthly_household_income, main_source_income,
        employment_status, other_financial_support,
        support_types, support_other,
        primary_reason_for_assistance, specific_needs, estimated_amount_needed, urgency,
        child_living_arrangement, other_children_needing_assistance, other_children_count,
        other_govt_assistance_received, other_govt_program, additional_info, form_data, uploaded_documents
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27,
        $28, $29, $30, $31, $32,
        $33, $34, $35, $36,
        $37, $38,
        $39, $40,
        $41, $42, $43, $44,
        $45, $46, $47,
        $48, $49, $50, $51, $52
      ) RETURNING id, reference_number`,
      [
        referenceNumber, String(userId || '0'), initialStatus, categoryId, categoryTitle, JSON.stringify(requiredDocumentIds || []),
        guardianFirstName || null, guardianMiddleName || null, guardianLastName || null, guardianSex || null, guardianDateOfBirth || null,
        guardianAge || null, guardianCivilStatus || null, guardianRelationship || null, guardianContactNo || null,
        guardianEmail || null, guardianValidId || null,
        addressHouseNo || null, addressStreet || null, addressBarangay || null, addressCity || null,
        childName || null, childSex || null, childBirthday || null, childAge || null, childSchoolDaycare || null, childBirthCertificate || null,
        childGradeLevel || null, childSchoolAddress || null, childEnrollmentStatus || null, childSpecialNeeds || null, childSpecialNeedsSpecify || null,
        householdMembers || null, childrenStudying || null, monthlyHouseholdIncome || null, mainSourceIncome || null,
        employmentStatus || null, otherFinancialSupport || null,
        JSON.stringify(supportTypes || []), supportOther || null,
        primaryReason || null, specificNeeds || null, estimatedAmountNeeded || null, urgency || null,
        childLivingArrangement || null, otherChildrenNeedingAssistance || null, otherChildrenCount || null,
        otherGovtAssistanceReceived || null, otherGovtProgram || null, additionalInfo || null, JSON.stringify(formData || {}),
        JSON.stringify(initialDocs || [])
      ]
    );

    const saved = result.rows[0];

    try {
      const { ensureBeneficiaryForUser } = require('./beneficiaryController');
      ensureBeneficiaryForUser({
        userId,
        qcid: (formData && (formData.qcidNumber || formData.qcidNo || formData.qcId)) || referenceNumber,
        fullName: [guardianFirstName, guardianMiddleName, guardianLastName].filter(Boolean).join(' ').trim() || childName,
        firstName: guardianFirstName,
        middleName: guardianMiddleName,
        lastName: guardianLastName,
        age: guardianAge,
        sex: guardianSex,
        civilStatus: guardianCivilStatus,
        birthDate: guardianDateOfBirth,
        address: `${addressHouseNo || ''} ${addressStreet || ''} ${addressBarangay || ''} ${addressCity || ''}`.trim(),
        contactNo: guardianContactNo,
        email: guardianEmail,
        householdMembers: householdMembers ? String(householdMembers) : '2',
        idType: guardianValidId || 'Valid ID',
        idNumber: referenceNumber,
        program: 'Child Welfare',
        applicationRef: saved.reference_number,
        action: 'Application submitted',
        remarks: `Child Welfare (${categoryTitle || 'General'}) application submitted for ${childName}.`,
        performedBy: [guardianFirstName, guardianLastName].filter(Boolean).join(' ') || 'Guardian',
      }).catch(() => {});
    } catch {}

    res.status(201).json({
      success: true,
      message: 'Application created successfully',
      referenceNumber: saved.reference_number,
      applicationId: saved.id,
    });
  } catch (error) {
    console.error('Error creating child welfare application:', error);
    res.status(500).json({ success: false, message: 'Error creating application', error: error.message });
  }
};

// Upload documents
exports.uploadDocuments = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { documentId, documentLabel } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const appResult = await db.query('SELECT uploaded_documents, extra_data FROM child_welfare_applications WHERE id = $1', [applicationId]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const syncFs = require('fs');
    const uploadedFiles = req.files.map((file) => {
      let dataUrl = '';
      try {
        if (file.path && syncFs.existsSync(file.path)) {
          const fileBuffer = syncFs.readFileSync(file.path);
          const mime = file.mimetype || 'image/jpeg';
          dataUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`;
        }
      } catch (e) {
        console.warn('Could not generate base64 dataUrl for uploaded file:', e);
      }
      return {
        filename: file.filename,
        fileUrl: `/uploads/child-welfare/${file.filename}`,
        dataUrl: dataUrl || undefined,
        previewUrl: dataUrl || undefined,
        fileSize: file.size,
        uploadedAt: new Date(),
      };
    });

    let uploadedDocuments = appResult.rows[0].uploaded_documents || [];
    const existingDocIndex = uploadedDocuments.findIndex((doc) => doc.documentId === documentId);

    if (existingDocIndex > -1) {
      uploadedDocuments[existingDocIndex] = {
        documentId,
        documentLabel: documentLabel || uploadedDocuments[existingDocIndex].documentLabel,
        files: uploadedFiles,
      };
    } else {
      uploadedDocuments.push({ documentId, documentLabel, files: uploadedFiles });
    }

    await db.query(
      'UPDATE child_welfare_applications SET uploaded_documents = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(uploadedDocuments), applicationId]
    );

    const isPhotoDoc = /photo|picture|2x2|id_pic|avatar/i.test(documentId || documentLabel || '');
    const photoFile = uploadedFiles.find((f) => f.dataUrl);
    if (isPhotoDoc && photoFile && photoFile.dataUrl) {
      try {
        await db.query(
          `UPDATE child_welfare_applications 
           SET extra_data = jsonb_set(COALESCE(extra_data, '{}'::jsonb), '{applicantPhoto}', to_jsonb($1::text), true)
           WHERE id = $2`,
          [photoFile.dataUrl, applicationId]
        );
      } catch (e) {}
    }

    res.status(200).json({ success: true, message: 'Documents uploaded successfully', files: uploadedFiles });
  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({ success: false, message: 'Error uploading documents', error: error.message });
  }
};

// Remove document
exports.removeDocument = async (req, res) => {
  try {
    const { applicationId, documentId, filename } = req.params;

    const appResult = await db.query('SELECT uploaded_documents FROM child_welfare_applications WHERE id = $1', [applicationId]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    let uploadedDocuments = appResult.rows[0].uploaded_documents || [];
    const documentIndex = uploadedDocuments.findIndex((doc) => doc.documentId === documentId);

    if (documentIndex > -1) {
      const fileIndex = uploadedDocuments[documentIndex].files.findIndex((file) => file.filename === filename);

      if (fileIndex > -1) {
        try {
          const filePath = path.join(__dirname, '../uploads/child-welfare', filename);
          await fs.unlink(filePath);
        } catch (err) {
          console.warn('Could not delete physical file:', err);
        }

        uploadedDocuments[documentIndex].files.splice(fileIndex, 1);
        if (uploadedDocuments[documentIndex].files.length === 0) {
          uploadedDocuments.splice(documentIndex, 1);
        }

        await db.query(
          'UPDATE child_welfare_applications SET uploaded_documents = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(uploadedDocuments), applicationId]
        );

        return res.status(200).json({ success: true, message: 'File removed successfully' });
      }
    }

    res.status(404).json({ success: false, message: 'File not found' });
  } catch (error) {
    console.error('Error removing document:', error);
    res.status(500).json({ success: false, message: 'Error removing document', error: error.message });
  }
};

// Submit application
exports.submitApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const appResult = await db.query('SELECT * FROM child_welfare_applications WHERE id = $1', [applicationId]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const application = appResult.rows[0];

    await db.query(
      `UPDATE child_welfare_applications SET application_status = 'pending', updated_at = NOW() WHERE id = $1`,
      [applicationId]
    );

    res.status(200).json({ success: true, message: 'Application submitted successfully', referenceNumber: application.reference_number });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ success: false, message: 'Error submitting application', error: error.message });
  }
};

// Get by reference number
exports.getApplicationByReference = async (req, res) => {
  try {
    const { referenceNumber } = req.params;
    const result = await db.query('SELECT * FROM child_welfare_applications WHERE reference_number = $1', [referenceNumber]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    res.status(200).json({ success: true, application: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all applications by user
exports.getUserApplications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { qcid, email } = req.query;

    const cleanUserId = userId && userId !== 'undefined' && userId !== 'null' && userId !== '0' && userId !== '1' ? String(userId).trim() : null;
    const cleanQcid = qcid && String(qcid).trim() ? String(qcid).trim() : null;
    const cleanEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : null;

    if (!cleanUserId && !cleanQcid && !cleanEmail) {
      return res.status(200).json({ success: true, applications: [] });
    }

    const params = [];
    const orClauses = [];

    if (cleanUserId) {
      params.push(cleanUserId);
      orClauses.push(`user_id::text = $${params.length}`);
    }
    if (cleanQcid) {
      params.push(cleanQcid);
      orClauses.push(`(reference_number = $${params.length} OR user_id::text = $${params.length})`);
    }
    if (cleanEmail) {
      params.push(cleanEmail);
      orClauses.push(`(LOWER(COALESCE(guardian_email, '')) = LOWER($${params.length}) OR LOWER(COALESCE(email, '')) = LOWER($${params.length}))`);
    }

    const result = await db.query(
      `SELECT * FROM child_welfare_applications WHERE ${orClauses.join(' OR ')} ORDER BY created_at DESC`,
      params
    );
    res.status(200).json({ success: true, applications: result.rows });
  } catch (error) {
    console.warn('Error fetching child welfare user applications:', error.message);
    res.status(200).json({ success: true, applications: [] });
  }
};

// Get all applications (admin)
exports.getAllApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = 'SELECT * FROM child_welfare_applications';
    const params = [];

    if (status) {
      params.push(status);
      query += ` WHERE application_status = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const offset = (page - 1) * limit;
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);

    const countParams = status ? [status] : [];
    const countQuery = status
      ? 'SELECT COUNT(*) FROM child_welfare_applications WHERE application_status = $1'
      : 'SELECT COUNT(*) FROM child_welfare_applications';
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    res.status(200).json({
      success: true,
      applications: result.rows,
      pagination: { total, page: parseInt(page, 10), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single application by id (admin)
exports.getApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const result = await db.query('SELECT * FROM child_welfare_applications WHERE id = $1', [applicationId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    res.status(200).json({ success: true, application: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update application status (admin) — may approved_amount para dito
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status, adminNotes, rejectionReason, approvedAmount, referenceNumber, reference_number } = req.body;

    if (!['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const finalAmount = status === 'approved' ? (approvedAmount || '5000') : null;
    const targetRef = referenceNumber || reference_number || applicationId;

    const result = await db.query(
      `UPDATE child_welfare_applications
       SET application_status = $1, admin_notes = $2, rejection_reason = $3,
           approved_by = $4, approved_amount = $5, updated_at = NOW()
       WHERE id::text = $6 OR reference_number = $6 OR reference_number = $7 RETURNING *`,
      [
        status,
        adminNotes || null,
        status === 'rejected' ? rejectionReason : null,
        status === 'approved' ? (req.user?.id || 'admin') : null,
        finalAmount,
        applicationId,
        targetRef,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = result.rows[0];

    // Auto-sync with Financial Aid Disbursements and Appointments upon approval
    if (status === 'approved') {
      try {
        const guardianName = [app.guardian_first_name, app.guardian_middle_name, app.guardian_last_name].filter(Boolean).join(' ').trim().toUpperCase() || 'GUARDIAN / BENEFICIARY';
        const disbId = `DISB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const title = app.category_title ? `${app.category_title} (Child Welfare)` : 'Child Welfare Assistance';
        const amt = Number(finalAmount) || 5000;

        const disbCheck = await db.query('SELECT id FROM financial_aid_disbursements WHERE application_ref = $1', [app.reference_number]);
        if (disbCheck.rows.length === 0) {
          await db.query(
            `INSERT INTO financial_aid_disbursements (
              disbursement_id, application_ref, applicant_name, assistance_type, fixed_amount,
              date_approved, status, venue, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
            ON CONFLICT DO NOTHING`,
            [
              disbId,
              app.reference_number,
              guardianName,
              title,
              amt,
              new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
              'Quezon City Hall - SSDD Child Welfare Section',
              'Approved Child Welfare financial grant. Ready for Appointment scheduling and payout.',
            ]
          );
        } else {
          await db.query(
            `UPDATE financial_aid_disbursements
             SET fixed_amount = $1, applicant_name = $2, assistance_type = $3, updated_at = NOW()
             WHERE application_ref = $4`,
            [amt, guardianName, title, app.reference_number]
          );
        }

        // Auto-create pending appointment record if not existing
        const apptCheck = await db.query('SELECT id FROM appointments WHERE reference_no = $1', [app.reference_number]);
        if (apptCheck.rows.length === 0) {
          await db.query(
            `INSERT INTO appointments (reference_no, module, applicant_name, concern, status, office_location, notes)
             VALUES ($1, 'Child Welfare', $2, $3, 'pending', 'Quezon City Hall - SSDD Child Welfare Section', 'Approved grant payout scheduling.')
             ON CONFLICT DO NOTHING`,
            [app.reference_number, guardianName, title]
          );
        }
      } catch (syncErr) {
        console.warn('[Child Welfare Approval Sync Warning]:', syncErr.message);
      }
    } else if (status === 'rejected') {
      try {
        await db.query('DELETE FROM financial_aid_disbursements WHERE application_ref = $1', [app.reference_number]).catch(() => {});
        await db.query('DELETE FROM appointments WHERE reference_no = $1', [app.reference_number]).catch(() => {});
      } catch (_) {}
    }

    res.status(200).json({ success: true, message: 'Application status updated', application: result.rows[0] });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel application (user)
exports.cancelApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const appResult = await db.query('SELECT * FROM child_welfare_applications WHERE id = $1', [applicationId]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    if (appResult.rows[0].application_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending applications can be cancelled' });
    }
    await db.query(`UPDATE child_welfare_applications SET application_status = 'cancelled', updated_at = NOW() WHERE id = $1`, [applicationId]);
    res.status(200).json({ success: true, message: 'Application cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete single application (admin)
exports.deleteApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (applicationId === 'clear-all' || applicationId === 'clear') {
      await db.query('DELETE FROM child_welfare_applications');
      return res.status(200).json({ success: true, message: 'All Child Welfare applications cleared successfully' });
    }
    const cleanId = String(applicationId).replace(/^CW-/, '').trim();
    await db.query(
      'DELETE FROM child_welfare_applications WHERE id::text = $1 OR reference_number = $1 OR reference_number = $2 RETURNING id',
      [cleanId, applicationId]
    );
    res.status(200).json({ success: true, message: 'Child welfare application deleted successfully' });
  } catch (error) {
    console.error('Error deleting child welfare application:', error);
    res.status(500).json({ success: false, message: 'Error deleting application', error: error.message });
  }
};

// Clear all child welfare applications (admin test cleanup)
exports.clearApplications = async (req, res) => {
  try {
    await db.query('DELETE FROM child_welfare_applications');
    res.status(200).json({ success: true, message: 'All Child Welfare applications cleared successfully' });
  } catch (error) {
    console.error('Error clearing child welfare applications:', error);
    res.status(500).json({ success: false, message: 'Error clearing applications', error: error.message });
  }
};

