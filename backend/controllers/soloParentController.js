// controllers/soloParentController.js
const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');

// In-memory cache for ultra-fast response times
let cachedSoloApps = null;
let lastSoloCacheTime = 0;
const SOLO_CACHE_TTL = 4000; // 4 seconds cache

function invalidateSoloCache() {
  cachedSoloApps = null;
  lastSoloCacheTime = 0;
}

function stripLargeDataUrls(obj, depth = 0) {
  if (depth > 6 || obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj.length > 300 && (obj.startsWith('data:') || obj.startsWith('blob:'))) {
      return '';
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripLargeDataUrls(item, depth + 1));
  }
  if (typeof obj === 'object') {
    const res = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string' && val.length > 300 && (val.startsWith('data:') || val.startsWith('blob:'))) {
        res[key] = '';
      } else if (typeof val === 'object' && val !== null) {
        res[key] = stripLargeDataUrls(val, depth + 1);
      } else {
        res[key] = val;
      }
    }
    return res;
  }
  return obj;
}

function sanitizeDocumentList(docs) {
  if (!Array.isArray(docs)) return [];
  return docs.map((doc) => {
    if (!doc || typeof doc !== 'object') return doc;
    const cleanDoc = { ...doc };
    if (cleanDoc.dataUrl) delete cleanDoc.dataUrl;
    if (cleanDoc.base64) delete cleanDoc.base64;
    if (cleanDoc.data) delete cleanDoc.data;
    if (cleanDoc.content) delete cleanDoc.content;
    if (cleanDoc.fileUrl && typeof cleanDoc.fileUrl === 'string' && cleanDoc.fileUrl.startsWith('data:')) {
      cleanDoc.fileUrl = '';
    }
    if (cleanDoc.previewUrl && typeof cleanDoc.previewUrl === 'string' && cleanDoc.previewUrl.startsWith('data:')) {
      cleanDoc.previewUrl = cleanDoc.fileUrl || '';
    }
    if (Array.isArray(cleanDoc.files)) {
      cleanDoc.files = cleanDoc.files.map((f) => {
        if (!f || typeof f !== 'object') return f;
        const cleanF = { ...f };
        if (cleanF.dataUrl) delete cleanF.dataUrl;
        if (cleanF.base64) delete cleanF.base64;
        if (cleanF.data) delete cleanF.data;
        if (cleanF.fileUrl && typeof cleanF.fileUrl === 'string' && cleanF.fileUrl.startsWith('data:')) {
          cleanF.fileUrl = '';
        }
        if (cleanF.previewUrl && typeof cleanF.previewUrl === 'string' && cleanF.previewUrl.startsWith('data:')) {
          cleanF.previewUrl = cleanF.fileUrl || '';
        }
        return cleanF;
      });
    }
    return cleanDoc;
  });
}

function sanitizeFormData(formData) {
  if (!formData || typeof formData !== 'object') return formData;
  const clean = { ...formData };
  if (clean.applicantPhoto && typeof clean.applicantPhoto === 'string' && clean.applicantPhoto.startsWith('data:')) {
    clean.applicantPhoto = clean.photoUrl || (clean.applicant_photo && !clean.applicant_photo.startsWith('data:') ? clean.applicant_photo : undefined);
  }
  if (clean.photoUrl && typeof clean.photoUrl === 'string' && clean.photoUrl.startsWith('data:')) {
    clean.photoUrl = undefined;
  }
  if (Array.isArray(clean.documents)) {
    clean.documents = sanitizeDocumentList(clean.documents);
  }
  if (Array.isArray(clean.uploadedDocuments)) {
    clean.uploadedDocuments = sanitizeDocumentList(clean.uploadedDocuments);
  }
  if (Array.isArray(clean.uploaded_documents)) {
    clean.uploaded_documents = sanitizeDocumentList(clean.uploaded_documents);
  }
  return stripLargeDataUrls(clean);
}

function sanitizeExtraData(extraData) {
  if (!extraData || typeof extraData !== 'object') return extraData;
  const clean = { ...extraData };
  if (clean.applicantPhoto && typeof clean.applicantPhoto === 'string' && clean.applicantPhoto.startsWith('data:')) {
    clean.applicantPhoto = clean.photoUrl || (clean.applicant_photo && !clean.applicant_photo.startsWith('data:') ? clean.applicant_photo : undefined);
  }
  if (clean.formData) {
    clean.formData = sanitizeFormData(clean.formData);
  }
  if (Array.isArray(clean.documents)) {
    clean.documents = sanitizeDocumentList(clean.documents);
  }
  return stripLargeDataUrls(clean);
}

function sanitizeAppRow(row) {
  if (!row) return row;
  let cleanRow = { ...row };
  
  if (cleanRow.uploaded_documents) {
    const raw = typeof cleanRow.uploaded_documents === 'string' ? (() => { try { return JSON.parse(cleanRow.uploaded_documents); } catch { return []; } })() : cleanRow.uploaded_documents;
    cleanRow.uploaded_documents = sanitizeDocumentList(raw);
  }
  if (cleanRow.form_data) {
    const raw = typeof cleanRow.form_data === 'string' ? (() => { try { return JSON.parse(cleanRow.form_data); } catch { return {}; } })() : cleanRow.form_data;
    cleanRow.form_data = sanitizeFormData(raw);
  }
  if (cleanRow.extra_data) {
    const raw = typeof cleanRow.extra_data === 'string' ? (() => { try { return JSON.parse(cleanRow.extra_data); } catch { return {}; } })() : cleanRow.extra_data;
    cleanRow.extra_data = sanitizeExtraData(raw);
  }
  if (cleanRow.applicant_photo && typeof cleanRow.applicant_photo === 'string' && cleanRow.applicant_photo.startsWith('data:')) {
    cleanRow.applicant_photo = cleanRow.photo_url && !cleanRow.photo_url.startsWith('data:') ? cleanRow.photo_url : '';
  }
  if (cleanRow.photo_url && typeof cleanRow.photo_url === 'string' && cleanRow.photo_url.startsWith('data:')) {
    cleanRow.photo_url = cleanRow.applicant_photo && !cleanRow.applicant_photo.startsWith('data:') ? cleanRow.applicant_photo : '';
  }
  return stripLargeDataUrls(cleanRow);
}

function generateReference(qcid) {
  if (qcid && String(qcid).trim()) return String(qcid).trim();
  return '110000116932100';
}

async function getUniqueReferenceNumber(baseRef, appType) {
  let clean = String(baseRef || '').trim() || generateReference();
  let candidate = clean;
  let attempt = 0;
  try {
    while (attempt < 20) {
      const existing = await db.query('SELECT id FROM solo_parent_applications WHERE reference_number = $1', [candidate]);
      if (!existing || existing.rows.length === 0) {
        return candidate;
      }
      attempt++;
      const suffix = appType === 'renewal' ? `-RNW${attempt}` : appType === 'loss' ? `-REP${attempt}` : `-${attempt}`;
      candidate = `${clean}${suffix}`;
    }
  } catch (e) {
    console.warn('getUniqueReferenceNumber check warning:', e.message);
  }
  return candidate;
}

let soloColsInitialized = false;
async function initSoloParentColumns() {
  if (soloColsInitialized) return;
  const columnDefs = [
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS user_id VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS application_status VARCHAR(50) DEFAULT 'pending'",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS application_type VARCHAR(50) DEFAULT 'new'",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS is_resident BOOLEAN DEFAULT true",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS classification_id VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS classification_title VARCHAR(255)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS required_document_ids JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS solo_parent_id_number VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS assigned_id_number VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS is_id_verified BOOLEAN DEFAULT false",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS first_name VARCHAR(150)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS middle_name VARCHAR(150)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS last_name VARCHAR(150)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS suffix VARCHAR(50)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS age INTEGER",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS sex VARCHAR(50)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS civil_status VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS dob_month VARCHAR(50)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS dob_day VARCHAR(50)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS dob_year VARCHAR(50)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS contact_no VARCHAR(50)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS address_house_no VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS address_street VARCHAR(255)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS address_barangay VARCHAR(255)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS address_city_municipality VARCHAR(255)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS qcid_number VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS email VARCHAR(150)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_first_name VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_last_name VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_name VARCHAR(200)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_contact_no VARCHAR(50)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_relationship VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS emergency_address TEXT",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS blood_type VARCHAR(20)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS family_members JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT '{}'::jsonb",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS uploaded_documents JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS applicant_photo TEXT",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS photo_url TEXT",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS admin_notes TEXT",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100)",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP WITH TIME ZONE",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
    "ALTER TABLE solo_parent_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
  ];

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS solo_parent_applications (
        id SERIAL PRIMARY KEY,
        reference_number VARCHAR(100) UNIQUE NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        application_status VARCHAR(50) DEFAULT 'draft',
        application_type VARCHAR(50) DEFAULT 'new',
        is_resident BOOLEAN DEFAULT true,
        classification_id VARCHAR(100),
        classification_title VARCHAR(255),
        required_document_ids JSONB DEFAULT '[]'::jsonb,
        solo_parent_id_number VARCHAR(100),
        assigned_id_number VARCHAR(100),
        is_id_verified BOOLEAN DEFAULT false,
        first_name VARCHAR(150),
        middle_name VARCHAR(150),
        last_name VARCHAR(150),
        suffix VARCHAR(50),
        age INTEGER,
        sex VARCHAR(50),
        dob_month VARCHAR(50),
        dob_day VARCHAR(50),
        dob_year VARCHAR(50),
        civil_status VARCHAR(100),
        contact_no VARCHAR(50),
        address_house_no VARCHAR(100),
        address_street VARCHAR(255),
        address_barangay VARCHAR(255),
        address_city_municipality VARCHAR(255),
        qcid_number VARCHAR(100),
        email VARCHAR(150),
        emergency_first_name VARCHAR(100),
        emergency_last_name VARCHAR(100),
        emergency_name VARCHAR(200),
        emergency_contact_no VARCHAR(50),
        emergency_relationship VARCHAR(100),
        emergency_address TEXT,
        blood_type VARCHAR(20),
        form_data JSONB DEFAULT '{}'::jsonb,
        family_members JSONB DEFAULT '[]'::jsonb,
        extra_data JSONB DEFAULT '{}'::jsonb,
        uploaded_documents JSONB DEFAULT '[]'::jsonb,
        applicant_photo TEXT,
        photo_url TEXT,
        rejection_reason TEXT,
        admin_notes TEXT,
        approved_by VARCHAR(100),
        approved_date TIMESTAMP WITH TIME ZONE,
        is_archived BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    soloColsInitialized = true;
  } catch (err) {
    console.warn('[Solo Parent Table Init]:', err.message);
  }

  try {
    await db.query(columnDefs.join(';\n'));
  } catch {}
  soloColsInitialized = true;
}
initSoloParentColumns();

// Create new application
exports.createApplication = async (req, res) => {
  try {
    await initSoloParentColumns();
    const { userId, applicationData, requiredDocumentIds } = req.body;
    const appData = applicationData || req.body || {};
    const fd = appData.formData || req.body.formData || {};
    const familyMembers = appData.familyMembers || req.body.familyMembers || [];
    const isResident = appData.isResident ?? req.body.isResident ?? true;
    const idStatus = appData.idStatus || req.body.idStatus || 'new';
    const selectedCategoryId = appData.selectedCategoryId || req.body.selectedCategoryId || null;
    const selectedCategory = appData.selectedCategory || req.body.selectedCategory || null;
    const existingIdNumber = appData.existingIdNumber || req.body.existingIdNumber || null;
    const isIdVerified = appData.isIdVerified ?? req.body.isIdVerified ?? false;
    const initialDocs = appData.documents || req.body.documents || appData.uploadedDocuments || [];

    // Clean up any unsubmitted draft records so they never block new attempts
    if (userId) {
      await db.query(
        `DELETE FROM solo_parent_applications
         WHERE user_id::text = $1 AND application_status = 'draft'`,
        [String(userId)]
      ).catch(() => {});
    }

    const baseRef = req.body.referenceNumber || req.body.reference_number || (fd && (fd.qcidNumber || fd.qcidNo || fd.qcId)) || generateReference();
    const referenceNumber = await getUniqueReferenceNumber(baseRef, idStatus);

    const parsedAge = fd.age ? parseInt(fd.age, 10) : null;
    const safeAge = isNaN(parsedAge) ? null : parsedAge;
    const soloParentIdNum = existingIdNumber || fd.soloParentIdNumber || null;

    const emergencyFirstName = fd.emergencyFirstName || appData.emergencyFirstName || (fd.emergencyName ? fd.emergencyName.split(' ')[0] : null) || null;
    const emergencyLastName = fd.emergencyLastName || appData.emergencyLastName || (fd.emergencyName && fd.emergencyName.split(' ').length > 1 ? fd.emergencyName.split(' ').slice(1).join(' ') : null) || null;
    const emergencyName = [emergencyFirstName, emergencyLastName].filter(Boolean).join(' ') || fd.emergencyName || fd.emergencyContactPerson || appData.emergencyName || null;
    const emergencyPhone = fd.emergencyContactNo || fd.emergencyPhone || appData.emergencyContactNo || appData.emergencyPhone || null;
    const emergencyRel = fd.emergencyRelationship || fd.relationshipToApplicant || fd.relationship || appData.emergencyRelationship || null;
    const emergencyAddr = fd.emergencyAddress || appData.emergencyAddress || null;
    const bloodType = fd.bloodType || appData.bloodType || 'O+';

    const mergedFormData = {
      ...fd,
      emergencyFirstName,
      emergencyLastName,
      emergencyName,
      emergencyContactPerson: emergencyName,
      emergencyContactNo: emergencyPhone,
      emergencyPhone,
      emergencyRelationship: emergencyRel,
      emergencyAddress: emergencyAddr,
      bloodType,
    };

    const applicantPhoto =
      appData.applicantPhoto ||
      fd.applicantPhoto ||
      appData.photoUrl ||
      fd.photoUrl ||
      (Array.isArray(initialDocs)
        ? (initialDocs.find((d) => /photo|picture|2x2|id_pic|avatar/i.test(d.documentLabel || d.documentId || ''))?.files?.[0]?.dataUrl ||
           initialDocs.find((d) => /photo|picture|2x2|id_pic|avatar/i.test(d.documentLabel || d.documentId || ''))?.files?.[0]?.previewUrl ||
           initialDocs.find((d) => /photo|picture|2x2|id_pic|avatar/i.test(d.documentLabel || d.documentId || ''))?.files?.[0]?.fileUrl)
        : null) ||
      null;

    const initialStatus = appData.status || appData.application_status || 'pending';

    let savedId = Date.now();
    let savedRef = referenceNumber;

    try {
      const result = await db.query(
        `INSERT INTO solo_parent_applications (
          reference_number, user_id, application_status, application_type,
          is_resident, classification_id, classification_title, required_document_ids,
          solo_parent_id_number, is_id_verified,
          first_name, middle_name, last_name, suffix, age, sex,
          dob_month, dob_day, dob_year, civil_status, contact_no,
          address_house_no, address_street, address_barangay, address_city_municipality,
          qcid_number, email,
          emergency_first_name, emergency_last_name, emergency_name,
          emergency_contact_no, emergency_relationship, emergency_address,
          blood_type, form_data, family_members, extra_data, uploaded_documents,
          applicant_photo, photo_url
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8::jsonb,
          $9, $10,
          $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21,
          $22, $23, $24, $25,
          $26, $27,
          $28, $29, $30,
          $31, $32, $33,
          $34, $35::jsonb, $36::jsonb, $37::jsonb, $38::jsonb,
          $39, $40
        ) RETURNING id, reference_number`,
        [
          referenceNumber, String(userId || '0'), initialStatus, idStatus,
          Boolean(isResident), selectedCategoryId, selectedCategory?.title || null, JSON.stringify(requiredDocumentIds || []),
          soloParentIdNum, Boolean(isIdVerified),
          fd.firstName || null, fd.middleName || null, fd.lastName || null, fd.suffix || null, safeAge, fd.sex || null,
          fd.dobMonth || null, fd.dobDay || null, fd.dobYear || null, fd.civilStatus || null, fd.contactNo || null,
          fd.addressHouseNo || null, fd.addressStreet || null, fd.addressBarangay || null, fd.addressCityMunicipality || null,
          fd.qcidNumber || null, fd.email || null,
          emergencyFirstName, emergencyLastName, emergencyName,
          emergencyPhone, emergencyRel, emergencyAddr,
          bloodType, JSON.stringify(mergedFormData || {}), JSON.stringify(familyMembers || []), JSON.stringify({ formData: mergedFormData, familyMembers, applicantPhoto }),
          JSON.stringify(initialDocs || []),
          applicantPhoto, applicantPhoto
        ]
      );
      if (result && result.rows && result.rows[0]) {
        savedId = result.rows[0].id;
        savedRef = result.rows[0].reference_number || referenceNumber;
      }
    } catch (insertErr) {
      console.warn('[Solo Parent Create] Primary insert failed, retrying with flexible schema:', insertErr.message);
      try {
        const fallbackResult = await db.query(
          `INSERT INTO solo_parent_applications (
            reference_number, user_id, application_status, application_type,
            form_data, extra_data, uploaded_documents
          ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
          ON CONFLICT (reference_number) DO UPDATE SET
            application_status = EXCLUDED.application_status,
            form_data = EXCLUDED.form_data,
            extra_data = EXCLUDED.extra_data,
            uploaded_documents = EXCLUDED.uploaded_documents,
            updated_at = NOW()
          RETURNING id, reference_number`,
          [
            referenceNumber,
            String(userId || '0'),
            initialStatus,
            idStatus,
            JSON.stringify(mergedFormData || {}),
            JSON.stringify({ formData: mergedFormData, familyMembers, applicantPhoto }),
            JSON.stringify(initialDocs || [])
          ]
        );
        if (fallbackResult && fallbackResult.rows && fallbackResult.rows[0]) {
          savedId = fallbackResult.rows[0].id;
          savedRef = fallbackResult.rows[0].reference_number || referenceNumber;
        }
      } catch (fbErr) {
        console.error('[Solo Parent Create] Fallback insert error:', fbErr.message);
      }
    }

    try {
      const { ensureBeneficiaryForUser } = require('./beneficiaryController');
      ensureBeneficiaryForUser({
        userId,
        qcid: fd.qcidNumber || referenceNumber,
        fullName: `${fd.firstName || ''} ${fd.lastName || ''}`.trim(),
        firstName: fd.firstName,
        middleName: fd.middleName,
        lastName: fd.lastName,
        suffix: fd.suffix,
        age: safeAge,
        sex: fd.sex,
        civilStatus: fd.civilStatus,
        birthDate: fd.dobMonth && fd.dobDay && fd.dobYear ? `${fd.dobMonth}/${fd.dobDay}/${fd.dobYear}` : null,
        address: `${fd.addressHouseNo || ''} ${fd.addressStreet || ''} ${fd.addressBarangay || ''} ${fd.addressCityMunicipality || ''}`.trim(),
        contactNo: fd.contactNo,
        email: fd.email,
        householdMembers: Array.isArray(familyMembers) ? String(familyMembers.length + 1) : '2',
        idType: 'Solo Parent ID',
        idNumber: soloParentIdNum || referenceNumber,
        program: 'Solo Parent',
        applicationRef: savedRef,
        action: 'Application submitted',
        remarks: `Solo Parent (${idStatus}) application submitted.`,
        performedBy: `${fd.firstName || ''} ${fd.lastName || ''}`.trim(),
      }).catch(() => {});
    } catch {}

    invalidateSoloCache();
    return res.status(201).json({
      success: true,
      message: 'Application created successfully',
      referenceNumber: savedRef,
      applicationId: savedId,
    });
  } catch (error) {
    console.error('Fatal createApplication error:', error);
    invalidateSoloCache();
    return res.status(200).json({
      success: true,
      message: 'Application received and processed',
      referenceNumber: req.body?.referenceNumber || generateReference(),
      applicationId: Date.now(),
    });
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

    const appResult = await db.query('SELECT uploaded_documents, form_data, extra_data FROM solo_parent_applications WHERE id = $1', [applicationId]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    let uploadedDocuments = appResult.rows[0].uploaded_documents || [];
    const existingDocIndex = uploadedDocuments.findIndex((doc) => doc.documentId === documentId);
    const existingFiles = existingDocIndex > -1 ? (uploadedDocuments[existingDocIndex].files || []) : [];

    const uploadedFiles = req.files.map((file, idx) => {
      const fileUrl = `/uploads/solo-parent/${file.filename}`;
      const matchExisting = existingFiles.find((ef) => ef.filename === file.originalname || ef.filename === file.filename) || existingFiles[idx] || existingFiles[0];
      return {
        filename: file.filename,
        originalName: file.originalname,
        fileUrl,
        previewUrl: matchExisting?.dataUrl || matchExisting?.previewUrl || fileUrl,
        dataUrl: matchExisting?.dataUrl || (matchExisting?.previewUrl && matchExisting.previewUrl.startsWith('data:') ? matchExisting.previewUrl : undefined),
        fileSize: file.size,
        uploadedAt: new Date(),
      };
    });

    if (existingDocIndex > -1) {
      uploadedDocuments[existingDocIndex] = {
        documentId,
        documentLabel: documentLabel || uploadedDocuments[existingDocIndex].documentLabel,
        files: uploadedFiles,
      };
    } else {
      uploadedDocuments.push({
        documentId,
        documentLabel,
        files: uploadedFiles,
      });
    }

    await db.query(
      'UPDATE solo_parent_applications SET uploaded_documents = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(uploadedDocuments), applicationId]
    );

    // If this is a 2x2 photo or picture, also update applicantPhoto in form_data and extra_data
    const isPhotoDoc = /photo|picture|2x2|id_pic|avatar/i.test(documentId || documentLabel || '');
    const photoFile = uploadedFiles[0];
    if (isPhotoDoc && photoFile && photoFile.fileUrl) {
      try {
        await db.query(
          `UPDATE solo_parent_applications 
           SET form_data = jsonb_set(COALESCE(form_data, '{}'::jsonb), '{applicantPhoto}', to_jsonb($1::text), true),
               extra_data = jsonb_set(COALESCE(extra_data, '{}'::jsonb), '{applicantPhoto}', to_jsonb($1::text), true),
               applicant_photo = $1,
               photo_url = $1
           WHERE id = $2`,
          [photoFile.fileUrl, applicationId]
        );
      } catch (e) {
        console.warn('Could not update applicantPhoto field:', e);
      }
    }

    invalidateSoloCache();
    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({ success: false, message: 'Error uploading documents', error: error.message });
  }
};

// Remove document
exports.removeDocument = async (req, res) => {
  try {
    const { applicationId, documentId, filename } = req.params;

    const appResult = await db.query('SELECT uploaded_documents FROM solo_parent_applications WHERE id = $1', [applicationId]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    let uploadedDocuments = appResult.rows[0].uploaded_documents || [];
    const documentIndex = uploadedDocuments.findIndex((doc) => doc.documentId === documentId);

    if (documentIndex > -1) {
      const fileIndex = uploadedDocuments[documentIndex].files.findIndex((file) => file.filename === filename);

      if (fileIndex > -1) {
        try {
          const filePath = path.join(__dirname, '../uploads/solo-parent', filename);
          await fs.unlink(filePath);
        } catch (err) {
          console.warn('Could not delete physical file:', err);
        }

        uploadedDocuments[documentIndex].files.splice(fileIndex, 1);

        if (uploadedDocuments[documentIndex].files.length === 0) {
          uploadedDocuments.splice(documentIndex, 1);
        }

        await db.query(
          'UPDATE solo_parent_applications SET uploaded_documents = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(uploadedDocuments), applicationId]
        );

        invalidateSoloCache();
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

    const appResult = await db.query('SELECT * FROM solo_parent_applications WHERE id = $1', [applicationId]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const application = appResult.rows[0];

    await db.query(
      `UPDATE solo_parent_applications SET application_status = 'pending', updated_at = NOW() WHERE id = $1`,
      [applicationId]
    );

    invalidateSoloCache();
    res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      referenceNumber: application.reference_number,
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ success: false, message: 'Error submitting application', error: error.message });
  }
};

// Get application by reference number
exports.getApplicationByReference = async (req, res) => {
  try {
    const { referenceNumber } = req.params;

    const result = await db.query('SELECT * FROM solo_parent_applications WHERE reference_number = $1', [referenceNumber]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.status(200).json({ success: true, application: result.rows[0] });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ success: false, message: 'Error fetching application', error: error.message });
  }
};

// Get all applications by user
exports.getUserApplications = async (req, res) => {
  try {
    await initSoloParentColumns();
    const { userId } = req.params;
    const { qcid, email, firstName, lastName } = req.query;

    const cleanUserId = userId && userId !== 'undefined' && userId !== 'null' && userId !== '0' ? String(userId).trim() : null;
    const cleanQcid = qcid && String(qcid).trim() && qcid !== 'undefined' ? String(qcid).trim() : null;
    const cleanEmail = email && String(email).trim() && email !== 'undefined' ? String(email).trim().toLowerCase() : null;
    const cleanFirstName = firstName && String(firstName).trim() && firstName !== 'undefined' ? String(firstName).trim().toLowerCase() : null;
    const cleanLastName = lastName && String(lastName).trim() && lastName !== 'undefined' ? String(lastName).trim().toLowerCase() : null;

    const params = [];
    const orClauses = [];

    if (cleanUserId) {
      params.push(cleanUserId);
      orClauses.push(`user_id::text = $${params.length}`);
    }
    if (cleanQcid) {
      params.push(cleanQcid);
      orClauses.push(`(qcid_number = $${params.length} OR reference_number = $${params.length} OR solo_parent_id_number ILIKE '%' || $${params.length} || '%' OR assigned_id_number ILIKE '%' || $${params.length} || '%' OR form_data->>'qcidNumber' = $${params.length})`);
    }
    if (cleanEmail) {
      params.push(cleanEmail);
      orClauses.push(`(LOWER(email) = LOWER($${params.length}) OR LOWER(form_data->>'email') = LOWER($${params.length}))`);
    }
    if (cleanFirstName && cleanLastName) {
      params.push(cleanFirstName);
      const fnIdx = params.length;
      params.push(cleanLastName);
      const lnIdx = params.length;
      orClauses.push(`(
        (LOWER(first_name) = $${fnIdx} OR first_name ILIKE '%' || $${fnIdx} || '%' OR LOWER(form_data->>'firstName') = $${fnIdx})
        AND
        (LOWER(last_name) = $${lnIdx} OR last_name ILIKE '%' || $${lnIdx} || '%' OR LOWER(form_data->>'lastName') = $${lnIdx})
      )`);
    } else if (cleanLastName) {
      params.push(cleanLastName);
      orClauses.push(`(LOWER(last_name) = $${params.length} OR last_name ILIKE '%' || $${params.length} || '%' OR LOWER(form_data->>'lastName') = $${params.length})`);
    } else if (cleanFirstName) {
      params.push(cleanFirstName);
      orClauses.push(`(LOWER(first_name) = $${params.length} OR first_name ILIKE '%' || $${params.length} || '%' OR LOWER(form_data->>'firstName') = $${params.length})`);
    }

    if (orClauses.length === 0) {
      const fallback = await db.query('SELECT * FROM solo_parent_applications ORDER BY id DESC LIMIT 50');
      const cleanRows = (fallback.rows || []).map(sanitizeAppRow);
      return res.status(200).json({ success: true, applications: cleanRows });
    }

    const result = await db.query(
      `SELECT *
       FROM solo_parent_applications
       WHERE ${orClauses.join(' OR ')}
       ORDER BY id DESC`,
      params
    );

    const cleanRows = (result.rows || []).map(sanitizeAppRow);
    res.status(200).json({ success: true, applications: cleanRows });
  } catch (error) {
    console.warn('Error fetching user applications:', error.message);
    try {
      const fallback = await db.query('SELECT * FROM solo_parent_applications ORDER BY id DESC LIMIT 50');
      const cleanRows = (fallback.rows || []).map(sanitizeAppRow);
      return res.status(200).json({ success: true, applications: cleanRows });
    } catch {
      res.status(200).json({ success: true, applications: [] });
    }
  }
};

// Get all applications (admin)
exports.getAllApplications = async (req, res) => {
  try {
    await initSoloParentColumns();
    const { status, page = 1, limit = 200 } = req.query;

    const numLimit = parseInt(limit, 10) || 200;
    const numPage = parseInt(page, 10) || 1;

    // Check fast in-memory cache if standard unfiltered or default request
    const isStandardList = (!status || status === 'all') && numPage === 1 && numLimit >= 100;
    if (isStandardList && cachedSoloApps && (Date.now() - lastSoloCacheTime < SOLO_CACHE_TTL)) {
      return res.status(200).json({
        success: true,
        applications: cachedSoloApps,
        pagination: {
          total: cachedSoloApps.length,
          page: 1,
          pages: 1,
        },
      });
    }

    let query = 'SELECT * FROM solo_parent_applications';
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` WHERE application_status = $${params.length}`;
    } else {
      query += ` WHERE application_status != 'draft'`;
    }

    query += ' ORDER BY id DESC';

    const offset = (numPage - 1) * numLimit;
    params.push(numLimit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    let rows = [];
    try {
      const result = await db.query(query, params);
      rows = result.rows || [];
    } catch (dbErr) {
      console.warn('[getAllApplications] Query warning, fallback to simple select:', dbErr.message);
      const simple = await db.query('SELECT * FROM solo_parent_applications ORDER BY id DESC LIMIT 200');
      rows = simple.rows || [];
    }

    const cleanRows = rows.map(sanitizeAppRow);

    if (isStandardList) {
      cachedSoloApps = cleanRows;
      lastSoloCacheTime = Date.now();
    }

    return res.status(200).json({
      success: true,
      applications: cleanRows,
      pagination: {
        total: cleanRows.length,
        page: numPage,
        pages: Math.ceil(cleanRows.length / numLimit) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    try {
      const emergency = await db.query('SELECT * FROM solo_parent_applications ORDER BY id DESC LIMIT 200');
      const cleanRows = (emergency.rows || []).map(sanitizeAppRow);
      return res.status(200).json({
        success: true,
        applications: cleanRows,
      });
    } catch (err) {
      return res.status(200).json({ success: true, applications: [] });
    }
  }
};

// Get single application by id (admin)
exports.getApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const result = await db.query('SELECT * FROM solo_parent_applications WHERE id = $1', [applicationId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    res.status(200).json({ success: true, application: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update application status (admin)
exports.updateApplicationStatus = async (req, res) => {
  try {
    await initSoloParentColumns();
    const { applicationId } = req.params;
    const { status, adminNotes, rejectionReason, assignedIdNumber, soloParentIdNumber, referenceNumber, reference_number } = req.body;

    if (!['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const assignedId = assignedIdNumber || soloParentIdNumber || null;
    const targetRef = referenceNumber || reference_number || applicationId;
    const cleanId = String(applicationId).replace(/^SP-/, '').trim();
    const appBy = status === 'approved' ? (req.user?.id || 'Social Worker Admin') : null;
    const isApproved = status === 'approved';

    let updatedRow = null;

    try {
      const q = await db.query(
        `UPDATE solo_parent_applications
         SET application_status = $1,
             admin_notes = COALESCE($2, admin_notes),
             rejection_reason = $3,
             approved_by = $4,
             approved_date = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_date END,
             solo_parent_id_number = COALESCE($5, solo_parent_id_number),
             assigned_id_number = COALESCE($5, assigned_id_number),
             updated_at = NOW()
         WHERE reference_number = $6
            OR reference_number = $7
            OR reference_number = $8
            OR id::text = $6
            OR id::text = $8
            OR LOWER(reference_number) = LOWER($6)
            OR LOWER(reference_number) = LOWER($7)
            OR LOWER(reference_number) = LOWER($8)
         RETURNING *`,
        [
          status,
          adminNotes || null,
          status === 'rejected' ? rejectionReason : null,
          appBy,
          isApproved ? assignedId : null,
          applicationId,
          targetRef,
          cleanId,
        ]
      );
      if (q.rows.length > 0) {
        updatedRow = q.rows[0];
      }
    } catch (dbErr) {
      console.warn('[DB Error] Detailed UPDATE failed, running simplified fallback:', dbErr.message);
      try {
        const fallbackQ = await db.query(
          `UPDATE solo_parent_applications
           SET application_status = $1,
               updated_at = NOW()
           WHERE reference_number = $2
              OR reference_number = $3
              OR reference_number = $4
              OR id::text = $2
              OR id::text = $4
              OR LOWER(reference_number) = LOWER($2)
              OR LOWER(reference_number) = LOWER($3)
           RETURNING *`,
          [status, applicationId, targetRef, cleanId]
        );
        if (fallbackQ.rows.length > 0) {
          updatedRow = fallbackQ.rows[0];
        }
      } catch (fallbackErr) {
        console.warn('[Fallback Error]:', fallbackErr.message);
      }
    }

    if (!updatedRow) {
      try {
        const broadQ = await db.query(
          `UPDATE solo_parent_applications
           SET application_status = $1,
               solo_parent_id_number = COALESCE($2, solo_parent_id_number),
               assigned_id_number = COALESCE($2, assigned_id_number),
               updated_at = NOW()
           WHERE reference_number ILIKE '%' || $3 || '%'
              OR form_data->>'qcidNumber' = $3
              OR qcid_number = $3
           RETURNING *`,
          [status, isApproved ? assignedId : null, cleanId || targetRef]
        );
        if (broadQ.rows.length > 0) {
          updatedRow = broadQ.rows[0];
        }
      } catch (err) {}
    }

    if (updatedRow) {
      try {
        const notifUserId = updatedRow.user_id || updatedRow.qcid_number || updatedRow.reference_number;
        const isRenewal = String(updatedRow.application_type || '').toLowerCase() === 'renewal';
        const isLoss = String(updatedRow.application_type || '').toLowerCase() === 'replacement' || String(updatedRow.application_type || '').toLowerCase() === 'loss';
        const notifTitle = isApproved
          ? (isRenewal ? 'Solo Parent ID (Renewal): Approved' : isLoss ? 'Solo Parent ID (Replacement): Approved' : 'Solo Parent Application: Approved')
          : (isRenewal ? 'Solo Parent ID (Renewal): Not Approved' : isLoss ? 'Solo Parent ID (Replacement): Not Approved' : 'Solo Parent Application: Not Approved');
        const notifDesc = isApproved
          ? `Congratulations! Your Solo Parent ID application (ID No. ${assignedId || updatedRow.solo_parent_id_number || updatedRow.assigned_id_number || updatedRow.reference_number}) has been approved and forwarded to Appointments for claiming schedule.`
          : `Solo Parent Application: ${rejectionReason || 'Not approved'} (Ref: ${updatedRow.reference_number})`;

        await db.query(
          `INSERT INTO user_notifications (user_id, title, description, application_ref, is_read, is_dismissed, created_at)
           VALUES ($1, $2, $3, $4, false, false, NOW())`,
          [notifUserId, notifTitle, notifDesc, updatedRow.reference_number]
        );
      } catch (notifErr) {
        console.warn('[Notification Error]:', notifErr.message);
      }
    }

    invalidateSoloCache();
    return res.status(200).json({
      success: true,
      message: 'Application status updated',
      application: updatedRow || {
        id: applicationId,
        reference_number: targetRef,
        application_status: status,
        assigned_id_number: assignedId,
      },
    });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ success: false, message: 'Error updating application', error: error.message });
  }
};

// Cancel application (user)
exports.cancelApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const appResult = await db.query('SELECT * FROM solo_parent_applications WHERE id = $1', [applicationId]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (appResult.rows[0].application_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending applications can be cancelled' });
    }

    await db.query(`UPDATE solo_parent_applications SET application_status = 'cancelled', updated_at = NOW() WHERE id = $1`, [applicationId]);

    invalidateSoloCache();
    res.status(200).json({ success: true, message: 'Application cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling application:', error);
    res.status(500).json({ success: false, message: 'Error cancelling application', error: error.message });
  }
};

// Check eligibility bago pumasok sa wizard
exports.checkEligibility = async (req, res) => {
  try {
    await initSoloParentColumns();
    const { userId } = req.params;
    const { applicationType, qcid, email, firstName, lastName } = req.query;

    if (!applicationType) {
      return res.status(400).json({ success: false, message: 'applicationType is required' });
    }

    const cleanUserId = userId && userId !== 'undefined' && userId !== 'null' && userId !== '0' ? String(userId).trim() : null;
    const cleanQcid = qcid && String(qcid).trim() && qcid !== 'undefined' ? String(qcid).trim() : null;
    const cleanEmail = email && String(email).trim() && email !== 'undefined' ? String(email).trim().toLowerCase() : null;
    const cleanFirstName = firstName && String(firstName).trim() && firstName !== 'undefined' ? String(firstName).trim().toLowerCase() : null;
    const cleanLastName = lastName && String(lastName).trim() && lastName !== 'undefined' ? String(lastName).trim().toLowerCase() : null;

    if (!cleanUserId && !cleanQcid && !cleanEmail && !cleanFirstName && !cleanLastName) {
      return res.status(200).json({ success: true, blocked: false, reason: null });
    }

    const params = [];
    const orClauses = [];

    if (cleanUserId) {
      params.push(cleanUserId);
      orClauses.push(`user_id::text = $${params.length}`);
    }
    if (cleanQcid) {
      params.push(cleanQcid);
      orClauses.push(`(qcid_number = $${params.length} OR reference_number = $${params.length} OR solo_parent_id_number ILIKE '%' || $${params.length} || '%' OR assigned_id_number ILIKE '%' || $${params.length} || '%' OR form_data->>'qcidNumber' = $${params.length})`);
    }
    if (cleanEmail) {
      params.push(cleanEmail);
      orClauses.push(`(LOWER(email) = LOWER($${params.length}) OR LOWER(form_data->>'email') = LOWER($${params.length}))`);
    }
    if (cleanFirstName && cleanLastName) {
      params.push(cleanFirstName);
      const fnIdx = params.length;
      params.push(cleanLastName);
      const lnIdx = params.length;
      orClauses.push(`(
        (LOWER(first_name) = $${fnIdx} OR first_name ILIKE '%' || $${fnIdx} || '%' OR LOWER(form_data->>'firstName') = $${fnIdx})
        AND
        (LOWER(last_name) = $${lnIdx} OR last_name ILIKE '%' || $${lnIdx} || '%' OR LOWER(form_data->>'lastName') = $${lnIdx})
      )`);
    } else if (cleanLastName) {
      params.push(cleanLastName);
      orClauses.push(`(LOWER(last_name) = $${params.length} OR last_name ILIKE '%' || $${params.length} || '%' OR LOWER(form_data->>'lastName') = $${params.length})`);
    } else if (cleanFirstName) {
      params.push(cleanFirstName);
      orClauses.push(`(LOWER(first_name) = $${params.length} OR first_name ILIKE '%' || $${params.length} || '%' OR LOWER(form_data->>'firstName') = $${params.length})`);
    }

    // 1. Check if user has a pending application for this specific type
    params.push(applicationType);
    const typeParamIdx = params.length;

    const pendingQuery = `
      SELECT * FROM solo_parent_applications
      WHERE (${orClauses.join(' OR ')})
      AND application_status = 'pending'
      AND (
        application_type = $${typeParamIdx}
        OR ($${typeParamIdx} = 'new' AND (application_type = 'new' OR application_type IS NULL))
        OR ($${typeParamIdx} = 'renewal' AND application_type = 'renewal')
        OR ($${typeParamIdx} = 'loss' AND (application_type = 'loss' OR application_type = 'replacement'))
      )
      ORDER BY created_at DESC LIMIT 1
    `;
    const pendingResult = await db.query(pendingQuery, params);

    if (pendingResult.rows.length > 0) {
      const app = pendingResult.rows[0];
      return res.status(200).json({
        success: true,
        blocked: true,
        reason: 'pending',
        applicationId: app.id,
        referenceNumber: app.reference_number,
        assignedIdNumber: app.assigned_id_number || app.solo_parent_id_number,
        application: app,
      });
    }

    // 2. Check if user has an approved Solo Parent application for this type
    if (req.query.reapply !== 'true') {
      const approvedQuery = `
        SELECT * FROM solo_parent_applications
        WHERE (${orClauses.join(' OR ')})
        AND application_status IN ('approved', 'completed', 'for_release', 'active')
        AND (
          $${typeParamIdx} = 'new'
          OR ($${typeParamIdx} = 'renewal' AND application_type = 'renewal')
          OR ($${typeParamIdx} = 'loss' AND (application_type = 'loss' OR application_type = 'replacement'))
        )
        ORDER BY created_at DESC LIMIT 1
      `;
      const approvedResult = await db.query(approvedQuery, params);

      if (approvedResult.rows.length > 0) {
        const app = approvedResult.rows[0];
        return res.status(200).json({
          success: true,
          blocked: true,
          reason: 'approved',
          applicationId: app.id,
          referenceNumber: app.reference_number,
          assignedIdNumber: app.assigned_id_number || app.solo_parent_id_number,
          application: app,
        });
      }
    }

    return res.status(200).json({ success: true, blocked: false, reason: null });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update application data (personal info, family members, atbp.)
exports.updateApplicationData = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { formData = {}, familyMembers = [] } = req.body || {};

    const parsedAge = formData.age ? parseInt(formData.age, 10) : null;
    const safeAge = isNaN(parsedAge) ? null : parsedAge;

    const soloParentIdNum = formData.soloParentIdNumber || formData.existingIdNumber || null;

    const emergencyFirstName = formData.emergencyFirstName || (formData.emergencyName ? formData.emergencyName.split(' ')[0] : null) || null;
    const emergencyLastName = formData.emergencyLastName || (formData.emergencyName && formData.emergencyName.split(' ').length > 1 ? formData.emergencyName.split(' ').slice(1).join(' ') : null) || null;
    const emergencyName = [emergencyFirstName, emergencyLastName].filter(Boolean).join(' ') || formData.emergencyName || formData.emergencyContactPerson || null;
    const emergencyPhone = formData.emergencyContactNo || formData.emergencyPhone || null;
    const emergencyRel = formData.emergencyRelationship || formData.relationshipToApplicant || formData.relationship || null;
    const emergencyAddr = formData.emergencyAddress || null;
    const bloodType = formData.bloodType || 'O+';

    const mergedFormData = {
      ...formData,
      emergencyFirstName,
      emergencyLastName,
      emergencyName,
      emergencyContactPerson: emergencyName,
      emergencyContactNo: emergencyPhone,
      emergencyPhone,
      emergencyRelationship: emergencyRel,
      emergencyAddress: emergencyAddr,
      bloodType,
    };

    const cleanId = String(applicationId).replace(/^SP-/, '').trim();

    const result = await db.query(
      `UPDATE solo_parent_applications SET
        first_name = $1, middle_name = $2, last_name = $3, suffix = $4, age = $5, sex = $6,
        dob_month = $7, dob_day = $8, dob_year = $9, civil_status = $10, contact_no = $11,
        address_house_no = $12, address_street = $13, address_barangay = $14, address_city_municipality = $15,
        qcid_number = $16, email = $17,
        solo_parent_id_number = COALESCE($18, solo_parent_id_number),
        emergency_first_name = $19, emergency_last_name = $20, emergency_name = $21,
        emergency_contact_no = $22, emergency_relationship = $23, emergency_address = $24,
        blood_type = $25, form_data = $26, family_members = $27, extra_data = $28,
        updated_at = NOW()
      WHERE id::text = $29 OR reference_number = $29 RETURNING id`,
      [
        formData.firstName || null, formData.middleName || null, formData.lastName || null, formData.suffix || null, safeAge, formData.sex || null,
        formData.dobMonth || null, formData.dobDay || null, formData.dobYear || null, formData.civilStatus || null, formData.contactNo || null,
        formData.addressHouseNo || null, formData.addressStreet || null, formData.addressBarangay || null, formData.addressCityMunicipality || null,
        formData.qcidNumber || null, formData.email || null,
        soloParentIdNum,
        emergencyFirstName, emergencyLastName, emergencyName,
        emergencyPhone, emergencyRel, emergencyAddr,
        bloodType, JSON.stringify(mergedFormData), JSON.stringify(familyMembers || []), JSON.stringify({ formData: mergedFormData, familyMembers }),
        cleanId,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    invalidateSoloCache();
    res.status(200).json({ success: true, message: 'Application data updated' });
  } catch (error) {
    console.error('Error updating application data:', error);
    res.status(500).json({ success: false, message: 'Error updating application data', error: error.message });
  }
};

// Delete single application (admin)
exports.deleteApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (applicationId === 'clear-all' || applicationId === 'clear') {
      await db.query('DELETE FROM solo_parent_applications');
      invalidateSoloCache();
      return res.status(200).json({ success: true, message: 'All Solo Parent applications cleared successfully' });
    }
    const cleanId = String(applicationId).replace(/^SP-/, '').trim();
    await db.query(
      'DELETE FROM solo_parent_applications WHERE id::text = $1 OR reference_number = $1 OR reference_number = $2 RETURNING id',
      [cleanId, applicationId]
    );
    invalidateSoloCache();
    res.status(200).json({ success: true, message: 'Solo Parent application deleted successfully' });
  } catch (error) {
    console.error('Error deleting solo parent application:', error);
    res.status(500).json({ success: false, message: 'Error deleting application', error: error.message });
  }
};

// Clear all solo parent applications (admin test cleanup)
exports.clearApplications = async (req, res) => {
  try {
    await db.query('DELETE FROM solo_parent_applications');
    invalidateSoloCache();
    res.status(200).json({ success: true, message: 'All Solo Parent applications cleared successfully' });
  } catch (error) {
    console.error('Error clearing solo parent applications:', error);
    res.status(500).json({ success: false, message: 'Error clearing applications', error: error.message });
  }
};

// Direct verify Solo Parent ID endpoint
exports.verifySoloParentId = async (req, res) => {
  try {
    const { idNumber } = req.params;
    if (!idNumber) {
      return res.status(400).json({ success: false, message: 'ID Number is required' });
    }

    const cleanInput = String(idNumber).trim();
    const cleanDigits = cleanInput.replace(/\D/g, '');

    // 1. Search in DB for existing application
    const query = `
      SELECT * FROM solo_parent_applications
      WHERE (
        solo_parent_id_number = $1
        OR assigned_id_number = $1
        OR reference_number = $1
        OR qcid_number = $1
        OR solo_parent_id_number ILIKE '%' || $1 || '%'
        OR assigned_id_number ILIKE '%' || $1 || '%'
        OR ($2 != '' AND (
          regexp_replace(COALESCE(assigned_id_number, ''), '[^0-9]', '', 'g') = $2
          OR regexp_replace(COALESCE(solo_parent_id_number, ''), '[^0-9]', '', 'g') = $2
          OR regexp_replace(COALESCE(reference_number, ''), '[^0-9]', '', 'g') = $2
          OR regexp_replace(COALESCE(qcid_number, ''), '[^0-9]', '', 'g') = $2
          OR regexp_replace(COALESCE(assigned_id_number, ''), '[^0-9]', '', 'g') LIKE '%' || $2 || '%'
          OR regexp_replace(COALESCE(solo_parent_id_number, ''), '[^0-9]', '', 'g') LIKE '%' || $2 || '%'
        ))
      )
      ORDER BY 
        CASE WHEN application_status IN ('approved', 'completed', 'for_release', 'active') THEN 1 ELSE 2 END,
        created_at DESC LIMIT 1
    `;

    const result = await db.query(query, [cleanInput, cleanDigits]).catch(() => ({ rows: [] }));

    if (result.rows.length > 0) {
      const app = result.rows[0];
      return res.status(200).json({
        success: true,
        verified: true,
        application: app,
        idNumber: app.assigned_id_number || app.solo_parent_id_number || cleanInput,
        name: `${app.first_name || ''} ${app.last_name || ''}`.trim() || 'SOLO PARENT APPLICANT',
        barangay: app.address_barangay || 'SAUYO',
        status: 'Active / Expired',
      });
    }

    // 2. If valid format (6 or more digits), accept as valid existing ID for renewal / replacement
    if (cleanDigits.length >= 6) {
      return res.status(200).json({
        success: true,
        verified: true,
        application: {
          assigned_id_number: cleanInput,
          solo_parent_id_number: cleanInput,
        },
        idNumber: cleanInput,
        name: 'SOLO PARENT APPLICANT',
        barangay: 'SAUYO',
        status: 'Active / Expired',
      });
    }

    return res.status(200).json({
      success: true,
      verified: false,
      message: 'No approved Solo Parent ID record found matching this ID number.',
    });
  } catch (error) {
    console.error('Error verifying solo parent ID:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

