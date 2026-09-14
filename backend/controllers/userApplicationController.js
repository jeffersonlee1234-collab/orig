const db = require('../config/db');
const { logActivity } = require('./activityLogController');

/**
 * POST /api/user-applications/delete or /archive
 * Moves application to deleted/trash state (soft delete)
 */
exports.archiveApplication = async (req, res) => {
  try {
    const {
      id,
      applicationNo,
      referenceNo,
      category,
      assistance,
      applicantName,
      email,
      dateOfBirth,
      address,
      contactNumber,
      status,
      dateApplied,
      reason,
      payload,
    } = req.body;

    const targetId = String(id || applicationNo || referenceNo || '').trim();
    const targetRef = String(referenceNo || applicationNo || id || '').trim();

    if (!targetId && !targetRef) {
      return res.status(400).json({ error: 'Application ID or Reference Number is required' });
    }

    const catUpper = String(category || '').toUpperCase();
    let updatedInDb = false;

    // 1. PWD & Senior Citizen
    if (catUpper.includes('PWD') || catUpper.includes('SENIOR') || catUpper.includes('DISABILITY')) {
      try {
        const q = await db.query(
          `UPDATE pwd_senior_applications
           SET is_archived = true, archived_at = NOW()
           WHERE id = $1 OR reference_number = $1 OR assigned_id_number = $1 OR id = $2 OR reference_number = $2
           RETURNING id, reference_number, category`,
          [targetId, targetRef]
        );
        if (q.rowCount > 0) updatedInDb = true;
      } catch (e) {
        console.warn('PWD soft delete query failed:', e.message);
      }
    }

    // 2. AICS
    if (catUpper.includes('AICS') || !updatedInDb) {
      try {
        const q = await db.query(
          `UPDATE aics_applications
           SET is_archived = true, archived_at = NOW()
           WHERE id::text = $1 OR qc_id = $1 OR reference_no = $1 OR reference_number = $1 OR id::text = $2 OR qc_id = $2
           RETURNING id, reference_no`,
          [targetId, targetRef]
        );
        if (q.rowCount > 0) updatedInDb = true;
      } catch (e) {
        console.warn('AICS soft delete query failed:', e.message);
      }
    }

    // 3. Solo Parent
    if (catUpper.includes('SOLO') || !updatedInDb) {
      try {
        const q = await db.query(
          `UPDATE solo_parent_applications
           SET is_archived = true, archived_at = NOW()
           WHERE id::text = $1 OR reference_number = $1 OR qcid_number = $1 OR id::text = $2
           RETURNING id, reference_number`,
          [targetId, targetRef]
        );
        if (q.rowCount > 0) updatedInDb = true;
      } catch (e) {
        console.warn('Solo parent soft delete query failed:', e.message);
      }
    }

    // 4. Child Welfare
    if (catUpper.includes('CHILD') || catUpper.includes('WELFARE') || !updatedInDb) {
      try {
        const q = await db.query(
          `UPDATE child_welfare_applications
           SET is_archived = true, archived_at = NOW()
           WHERE id::text = $1 OR reference_number = $1 OR id::text = $2
           RETURNING id, reference_number`,
          [targetId, targetRef]
        );
        if (q.rowCount > 0) updatedInDb = true;
      } catch (e) {
        console.warn('Child welfare soft delete query failed:', e.message);
      }
    }

    // 5. Livelihood
    if (catUpper.includes('LIVELIHOOD') || !updatedInDb) {
      try {
        const q = await db.query(
          `UPDATE livelihood_applications
           SET is_archived = true, archived_at = NOW()
           WHERE id::text = $1 OR reference_number = $1 OR qcid = $1 OR id::text = $2
           RETURNING id, reference_number`,
          [targetId, targetRef]
        );
        if (q.rowCount > 0) updatedInDb = true;
      } catch (e) {
        console.warn('Livelihood soft delete query failed:', e.message);
      }
    }

    // 6. Training
    if (catUpper.includes('TRAIN') || !updatedInDb) {
      try {
        const q = await db.query(
          `UPDATE training_applications
           SET is_archived = true, archived_at = NOW()
           WHERE id::text = $1 OR reference_number = $1 OR qcid = $1 OR id::text = $2
           RETURNING id, reference_number`,
          [targetId, targetRef]
        );
        if (q.rowCount > 0) updatedInDb = true;
      } catch (e) {
        console.warn('Training soft delete query failed:', e.message);
      }
    }

    // Full snapshot payload for restoration
    const fullPayload = payload || {
      applicationNo: targetRef || targetId,
      assistance: assistance || 'Social Service Application',
      assistanceCategory: category || 'General',
      applicantName: applicantName || 'Resident',
      email: email || '',
      dateOfBirth: dateOfBirth || '',
      address: address || '',
      contactNumber: contactNumber || '',
      status: status || 'Approved',
      dateApplied: dateApplied || new Date().toISOString(),
    };

    // Save/Update in archived_applications table
    try {
      await db.query(
        `INSERT INTO archived_applications (
           application_id, reference_no, category, assistance_title, applicant_name, email, status, payload, reason, archived_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          targetId,
          targetRef,
          category || 'General',
          assistance || 'Social Service Application',
          applicantName || 'Resident',
          email || null,
          status || 'Pending',
          JSON.stringify(fullPayload),
          reason || 'Deleted by user from History Application',
        ]
      );
    } catch (auditErr) {
      console.warn('Could not insert to archived_applications table:', auditErr.message);
    }

    // Record activity log
    if (logActivity) {
      logActivity({
        actor: applicantName || 'Resident User',
        actorRole: 'User',
        action: 'deleted',
        module: category || 'History Application',
        referenceNo: targetRef || targetId,
        subject: `Deleted Application (${assistance || category || 'Social Service'})`,
        detail: `Application ${targetRef} was moved to deleted applications.`,
      });
    }

    return res.json({
      success: true,
      message: 'Application successfully moved to Deleted Applications.',
      id: targetId,
      referenceNo: targetRef,
    });
  } catch (err) {
    console.error('Error deleting application:', err);
    return res.status(500).json({ error: 'Failed to delete application', details: err.message });
  }
};

/**
 * GET /api/user-applications/deleted
 * Returns all soft-deleted / archived applications for the given user
 */
exports.getDeletedApplications = async (req, res) => {
  try {
    const { email, qcid, name } = req.query;
    const queryEmail = String(email || '').trim().toLowerCase();
    const queryQc = String(qcid || '').trim().toLowerCase();
    const queryName = String(name || '').trim().toLowerCase();

    let queryText = 'SELECT * FROM archived_applications ORDER BY archived_at DESC';
    let params = [];

    if (queryEmail || queryQc || queryName) {
      queryText = `
        SELECT * FROM archived_applications
        WHERE ($1 != '' AND LOWER(email) = $1)
           OR ($2 != '' AND (LOWER(reference_no) = $2 OR LOWER(application_id) = $2 OR LOWER(qcid) = $2))
           OR ($3 != '' AND LOWER(applicant_name) LIKE '%' || $3 || '%')
        ORDER BY archived_at DESC
      `;
      params = [queryEmail, queryQc, queryName];
    }

    const result = await db.query(queryText, params);
    const rows = result.rows.map((row) => {
      let payload = {};
      if (typeof row.payload === 'object' && row.payload !== null) {
        payload = row.payload;
      } else if (typeof row.payload === 'string') {
        try {
          payload = JSON.parse(row.payload);
        } catch {
          payload = {};
        }
      }
      return {
        id: row.id,
        applicationId: row.application_id,
        referenceNo: row.reference_no,
        category: row.category,
        assistanceTitle: row.assistance_title,
        applicantName: row.applicant_name,
        email: row.email,
        status: row.status,
        archivedAt: row.archived_at,
        reason: row.reason,
        payload: payload,
      };
    });

    return res.json({ success: true, count: rows.length, applications: rows });
  } catch (err) {
    console.warn('Error querying archived_applications table, returning empty:', err.message);
    return res.json({ success: true, count: 0, applications: [] });
  }
};

/**
 * POST /api/user-applications/restore
 * Restores a soft-deleted application (sets is_archived = false)
 */
exports.restoreApplication = async (req, res) => {
  try {
    const { id, applicationNo, referenceNo, category, assistance, applicantName } = req.body;
    const targetId = String(id || applicationNo || referenceNo || '').trim();
    const targetRef = String(referenceNo || applicationNo || id || '').trim();

    if (!targetId && !targetRef) {
      return res.status(400).json({ error: 'Application ID or Reference Number is required' });
    }

    // 1. PWD & Senior Citizen
    try {
      await db.query(
        `UPDATE pwd_senior_applications
         SET is_archived = false, archived_at = NULL
         WHERE id = $1 OR reference_number = $1 OR assigned_id_number = $1 OR id = $2 OR reference_number = $2`,
        [targetId, targetRef]
      );
    } catch (e) {
      console.warn('PWD restore query failed:', e.message);
    }

    // 2. AICS
    try {
      await db.query(
        `UPDATE aics_applications
         SET is_archived = false, archived_at = NULL
         WHERE id::text = $1 OR qc_id = $1 OR reference_no = $1 OR reference_number = $1 OR id::text = $2 OR qc_id = $2`,
        [targetId, targetRef]
      );
    } catch (e) {
      console.warn('AICS restore query failed:', e.message);
    }

    // 3. Solo Parent
    try {
      await db.query(
        `UPDATE solo_parent_applications
         SET is_archived = false, archived_at = NULL
         WHERE id::text = $1 OR reference_number = $1 OR qcid_number = $1 OR id::text = $2`,
        [targetId, targetRef]
      );
    } catch (e) {
      console.warn('Solo parent restore query failed:', e.message);
    }

    // 4. Child Welfare
    try {
      await db.query(
        `UPDATE child_welfare_applications
         SET is_archived = false, archived_at = NULL
         WHERE id::text = $1 OR reference_number = $1 OR id::text = $2`,
        [targetId, targetRef]
      );
    } catch (e) {
      console.warn('Child welfare restore query failed:', e.message);
    }

    // 5. Livelihood
    try {
      await db.query(
        `UPDATE livelihood_applications
         SET is_archived = false, archived_at = NULL
         WHERE id::text = $1 OR reference_number = $1 OR qcid = $1 OR id::text = $2`,
        [targetId, targetRef]
      );
    } catch (e) {
      console.warn('Livelihood restore query failed:', e.message);
    }

    // 6. Training
    try {
      await db.query(
        `UPDATE training_applications
         SET is_archived = false, archived_at = NULL
         WHERE id::text = $1 OR reference_number = $1 OR qcid = $1 OR id::text = $2`,
        [targetId, targetRef]
      );
    } catch (e) {
      console.warn('Training restore query failed:', e.message);
    }

    // Remove from archived_applications table
    try {
      await db.query(
        `DELETE FROM archived_applications
         WHERE application_id = $1 OR reference_no = $1 OR application_id = $2 OR reference_no = $2`,
        [targetId, targetRef]
      );
    } catch (e) {}

    // Record activity log
    if (logActivity) {
      logActivity({
        actor: applicantName || 'Resident User',
        actorRole: 'User',
        action: 'restored',
        module: category || 'History Application',
        referenceNo: targetRef || targetId,
        subject: `Restored Application (${assistance || category || 'Social Service'})`,
        detail: `Application ${targetRef} was restored back to active applications list.`,
      });
    }

    return res.json({
      success: true,
      message: 'Application restored successfully.',
      id: targetId,
      referenceNo: targetRef,
    });
  } catch (err) {
    console.error('Error restoring application:', err);
    return res.status(500).json({ error: 'Failed to restore application', details: err.message });
  }
};

/**
 * POST /api/user-applications/permanent-delete
 * Permanently deletes application from database
 */
exports.permanentDeleteApplication = async (req, res) => {
  try {
    const { id, applicationNo, referenceNo, category, assistance, applicantName } = req.body;
    const targetId = String(id || applicationNo || referenceNo || '').trim();
    const targetRef = String(referenceNo || applicationNo || id || '').trim();

    if (!targetId && !targetRef) {
      return res.status(400).json({ error: 'Application ID or Reference Number is required' });
    }

    // Hard delete from database tables
    try {
      await db.query(
        `DELETE FROM pwd_senior_applications
         WHERE id = $1 OR reference_number = $1 OR assigned_id_number = $1 OR id = $2 OR reference_number = $2`,
        [targetId, targetRef]
      );
    } catch (e) {}

    try {
      await db.query(
        `DELETE FROM aics_applications
         WHERE id::text = $1 OR qc_id = $1 OR reference_no = $1 OR reference_number = $1 OR id::text = $2 OR qc_id = $2`,
        [targetId, targetRef]
      );
    } catch (e) {}

    try {
      await db.query(
        `DELETE FROM solo_parent_applications
         WHERE id::text = $1 OR reference_number = $1 OR qcid_number = $1 OR id::text = $2`,
        [targetId, targetRef]
      );
    } catch (e) {}

    try {
      await db.query(
        `DELETE FROM child_welfare_applications
         WHERE id::text = $1 OR reference_number = $1 OR id::text = $2`,
        [targetId, targetRef]
      );
    } catch (e) {}

    try {
      await db.query(
        `DELETE FROM livelihood_applications
         WHERE id::text = $1 OR reference_number = $1 OR qcid = $1 OR id::text = $2`,
        [targetId, targetRef]
      );
    } catch (e) {}

    try {
      await db.query(
        `DELETE FROM training_applications
         WHERE id::text = $1 OR reference_number = $1 OR qcid = $1 OR id::text = $2`,
        [targetId, targetRef]
      );
    } catch (e) {}

    try {
      await db.query(
        `DELETE FROM archived_applications
         WHERE application_id = $1 OR reference_no = $1 OR application_id = $2 OR reference_no = $2`,
        [targetId, targetRef]
      );
    } catch (e) {}

    // Record activity log
    if (logActivity) {
      logActivity({
        actor: applicantName || 'Resident User',
        actorRole: 'User',
        action: 'permanently_deleted',
        module: category || 'History Application',
        referenceNo: targetRef || targetId,
        subject: `Permanently Deleted Application (${assistance || category || 'Social Service'})`,
        detail: `Application ${targetRef} was permanently purged from the database.`,
      });
    }

    return res.json({
      success: true,
      message: 'Application permanently deleted from database.',
      id: targetId,
      referenceNo: targetRef,
    });
  } catch (err) {
    console.error('Error permanently deleting application:', err);
    return res.status(500).json({ error: 'Failed to permanently delete application', details: err.message });
  }
};
