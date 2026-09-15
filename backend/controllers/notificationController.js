// controllers/notificationController.js
const db = require('../config/db');

let tableInitPromise = null;
async function ensureTables() {
  if (!tableInitPromise) {
    tableInitPromise = (async () => {
      try {
        await db.query(`
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
          CREATE TABLE IF NOT EXISTS user_notification_state (
            id SERIAL PRIMARY KEY,
            user_identifier VARCHAR(150) NOT NULL,
            notif_id VARCHAR(255) NOT NULL,
            is_read BOOLEAN DEFAULT false,
            is_dismissed BOOLEAN DEFAULT false,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notif_state_user_notif ON user_notification_state(user_identifier, notif_id);
          CREATE INDEX IF NOT EXISTS idx_user_notif_user_id ON user_notifications(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_notif_app_ref ON user_notifications(application_ref);
        `);
      } catch (err) {
        console.warn('Warning creating notification tables:', err.message);
      }
    })();
  }
  return tableInitPromise;
}

// Ensure tables exist once on startup
ensureTables();

function extractIdentifiers(req) {
  const src = { ...req.query, ...req.body };
  const rawList = [
    src.userId,
    src.qcid,
    src.email,
    src.ref,
    src.userIdentifier,
    src.user_id,
    src.qcidNumber,
    src.reference_number,
    src.reference_no,
    src.applicationRef,
    src.assignedId,
    src.assigned_id_number,
  ];
  return Array.from(
    new Set(
      rawList
        .filter(Boolean)
        .map((s) => String(s).trim())
        .filter((s) => s.length > 0 && s !== 'undefined' && s !== 'null')
    )
  );
}

function formatManilaTime(dateInput) {
  if (!dateInput) return new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

// GET /api/notifications
// Aggregates real-time notifications for user across all services and syncs read/dismissed state
exports.getNotifications = async (req, res) => {
  try {
    let identifiers = extractIdentifiers(req);
    const { email, firstName, lastName } = req.query;
    const userEmail = (email || '').toLowerCase().trim();
    const userFn = (firstName || '').trim().toLowerCase();
    const userLn = (lastName || '').trim().toLowerCase();

    // 0. Auto-discover all application references belonging to this user
    if (identifiers.length > 0 || userEmail || (userFn && userLn)) {
      // Collect from solo_parent_applications
      try {
        const spRes = await db.query(
          `SELECT reference_number, user_id, assigned_id_number, solo_parent_id_number, qcid_number 
           FROM solo_parent_applications 
           WHERE (COALESCE(user_id::text, '') = ANY($1::text[]) 
              OR COALESCE(qcid_number::text, '') = ANY($1::text[]) 
              OR COALESCE(reference_number::text, '') = ANY($1::text[]) 
              OR COALESCE(assigned_id_number::text, '') = ANY($1::text[]) 
              OR COALESCE(solo_parent_id_number::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(first_name, '')) = $3 AND LOWER(COALESCE(last_name, '')) = $4))`,
          [identifiers, userEmail, userFn, userLn]
        );
        spRes.rows.forEach((r) => {
          if (r.reference_number) identifiers.push(String(r.reference_number));
          if (r.assigned_id_number) identifiers.push(String(r.assigned_id_number));
          if (r.solo_parent_id_number) identifiers.push(String(r.solo_parent_id_number));
          if (r.qcid_number) identifiers.push(String(r.qcid_number));
          if (r.user_id) identifiers.push(String(r.user_id));
        });
      } catch (_) {}

      // Collect from pwd_senior_applications
      try {
        const pwdRes = await db.query(
          `SELECT reference_number, user_id, assigned_id_number, qcid 
           FROM pwd_senior_applications 
           WHERE (COALESCE(user_id::text, '') = ANY($1::text[]) 
              OR COALESCE(qcid::text, '') = ANY($1::text[]) 
              OR COALESCE(reference_number::text, '') = ANY($1::text[]) 
              OR COALESCE(assigned_id_number::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(first_name, '')) = $3 AND LOWER(COALESCE(last_name, '')) = $4))`,
          [identifiers, userEmail, userFn, userLn]
        );
        pwdRes.rows.forEach((r) => {
          if (r.reference_number) identifiers.push(String(r.reference_number));
          if (r.assigned_id_number) identifiers.push(String(r.assigned_id_number));
          if (r.qcid) identifiers.push(String(r.qcid));
          if (r.user_id) identifiers.push(String(r.user_id));
        });
      } catch (_) {}

      // Collect from livelihood_applications
      try {
        const livRes = await db.query(
          `SELECT reference_number, user_id, qcid 
           FROM livelihood_applications 
           WHERE (COALESCE(user_id::text, '') = ANY($1::text[]) 
              OR COALESCE(qcid::text, '') = ANY($1::text[]) 
              OR COALESCE(reference_number::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(first_name, '')) = $3 AND LOWER(COALESCE(last_name, '')) = $4))`,
          [identifiers, userEmail, userFn, userLn]
        );
        livRes.rows.forEach((r) => {
          if (r.reference_number) identifiers.push(String(r.reference_number));
          if (r.qcid) identifiers.push(String(r.qcid));
          if (r.user_id) identifiers.push(String(r.user_id));
        });
      } catch (_) {}

      // Collect from aics_applications
      try {
        const aicsRes = await db.query(
          `SELECT reference_no, qc_id 
           FROM aics_applications 
           WHERE (COALESCE(qc_id::text, '') = ANY($1::text[]) 
              OR COALESCE(reference_no::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(first_name, '')) = $3 AND LOWER(COALESCE(last_name, '')) = $4))`,
          [identifiers, userEmail, userFn, userLn]
        );
        aicsRes.rows.forEach((r) => {
          if (r.reference_no) identifiers.push(String(r.reference_no));
          if (r.qc_id) identifiers.push(String(r.qc_id));
        });
      } catch (_) {}

      // Collect from child_welfare_applications
      try {
        const cwRes = await db.query(
          `SELECT reference_number, user_id 
           FROM child_welfare_applications 
           WHERE (COALESCE(user_id::text, '') = ANY($1::text[]) 
              OR COALESCE(reference_number::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(guardian_email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(guardian_first_name, '')) = $3 AND LOWER(COALESCE(guardian_last_name, '')) = $4))`,
          [identifiers, userEmail, userFn, userLn]
        );
        cwRes.rows.forEach((r) => {
          if (r.reference_number) identifiers.push(String(r.reference_number));
          if (r.user_id) identifiers.push(String(r.user_id));
        });
      } catch (_) {}

      // Collect from training_applications
      try {
        const trnRes = await db.query(
          `SELECT reference_number, user_id, qcid 
           FROM training_applications 
           WHERE (COALESCE(user_id::text, '') = ANY($1::text[]) 
              OR COALESCE(qcid::text, '') = ANY($1::text[]) 
              OR COALESCE(reference_number::text, '') = ANY($1::text[]))
              OR (COALESCE(applicant_info::text, '') ILIKE '%' || $2 || '%' AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (COALESCE(applicant_info::text, '') ILIKE '%' || $3 || '%' AND COALESCE(applicant_info::text, '') ILIKE '%' || $4 || '%'))`,
          [identifiers, userEmail, userFn, userLn]
        );
        trnRes.rows.forEach((r) => {
          if (r.reference_number) identifiers.push(String(r.reference_number));
          if (r.qcid) identifiers.push(String(r.qcid));
          if (r.user_id) identifiers.push(String(r.user_id));
        });
      } catch (_) {}

      identifiers = Array.from(new Set(identifiers.filter((s) => s && s !== 'undefined' && s !== 'null')));
    }

    // 1. Fetch persistent read and dismissed state and __ALL__ cutoff for this user
    let userStateMap = {};
    let dismissAllCutoff = null;

    if (identifiers.length > 0) {
      try {
        const stateRes = await db.query(
          `SELECT notif_id, is_read, is_dismissed, updated_at 
           FROM user_notification_state 
           WHERE user_identifier = ANY($1::text[])`,
          [identifiers]
        );
        stateRes.rows.forEach((r) => {
          if (r.notif_id === '__ALL__' && r.is_dismissed) {
            const cutoffDate = new Date(r.updated_at);
            if (!dismissAllCutoff || cutoffDate > dismissAllCutoff) {
              dismissAllCutoff = cutoffDate;
            }
          }
          userStateMap[r.notif_id] = {
            is_read: Boolean(r.is_read),
            is_dismissed: Boolean(r.is_dismissed),
          };
        });
      } catch (e) {
        console.warn('Error fetching notification state:', e.message);
      }
    }

    const isItemDismissed = (notifId, createdAt) => {
      if (userStateMap[notifId]?.is_dismissed) return true;
      if (dismissAllCutoff && createdAt) {
        const itemDate = new Date(createdAt);
        if (!isNaN(itemDate.getTime()) && itemDate.getTime() <= dismissAllCutoff.getTime()) {
          return true;
        }
      }
      return false;
    };

    const items = [];

    // 2. Fetch direct user_notifications
    try {
      let query = `SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 50`;
      let params = [];
      if (identifiers.length > 0) {
        query = `SELECT * FROM user_notifications 
                 WHERE COALESCE(user_id::text, '') = ANY($1::text[]) OR COALESCE(application_ref::text, '') = ANY($1::text[])
                 ORDER BY created_at DESC LIMIT 50`;
        params = [identifiers];
      }
      const directRes = await db.query(query, params);
      directRes.rows.forEach((r) => {
        const notifId = `db-notif-${r.id}`;
        if (!isItemDismissed(notifId, r.created_at) && !r.is_dismissed) {
          items.push({
            id: notifId,
            title: r.title,
            desc: r.description,
            time: formatManilaTime(r.created_at),
            unread: userStateMap[notifId]?.is_read !== undefined ? !userStateMap[notifId].is_read : !r.is_read,
            reference_no: r.application_ref || null,
            created_at: r.created_at,
          });
        }
      });
    } catch (_) {}

    // 3. Fetch AICS applications notifications
    if (identifiers.length > 0 || userEmail || (userFn && userLn)) {
      try {
        const aicsRes = await db.query(
          `SELECT id, reference_no, qc_id, assistance_type, status, rejection_reason, created_at, updated_at, email
           FROM aics_applications 
           WHERE (COALESCE(qc_id::text, '') = ANY($1::text[]) OR COALESCE(reference_no::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(first_name, '')) = $3 AND LOWER(COALESCE(last_name, '')) = $4))
           ORDER BY created_at DESC`,
          [identifiers, userEmail, userFn, userLn]
        );
        aicsRes.rows.forEach((app) => {
          const st = String(app.status || "").toLowerCase();
          if (st === 'approved' || st === 'rejected' || st === 'completed') {
            const notifId = `aics-${app.id}-${st}`;
            const appDate = app.updated_at || app.created_at;
            if (!isItemDismissed(notifId, appDate)) {
              const isApproved = st === 'approved' || st === 'completed';
              items.push({
                id: notifId,
                title: isApproved ? 'AICS Assistance Application: Approved' : 'AICS Assistance Application: Not Approved',
                desc: `${app.assistance_type || 'AICS Financial Aid'} — Ref: ${app.reference_no || app.qc_id}`,
                time: formatManilaTime(appDate),
                unread: userStateMap[notifId]?.is_read !== undefined ? !userStateMap[notifId].is_read : true,
                reason: app.rejection_reason || null,
                reference_no: app.reference_no || app.qc_id,
                created_at: appDate,
              });
            }
          }
        });
      } catch (_) {}
    }

    // 4. Fetch PWD & Senior Citizen applications notifications
    if (identifiers.length > 0 || userEmail || (userFn && userLn)) {
      try {
        const pwdRes = await db.query(
          `SELECT id, reference_number, qcid, category, service, status, rejection_reason, approved_date, created_at, email, assigned_id_number, application_type
           FROM pwd_senior_applications 
           WHERE (COALESCE(qcid::text, '') = ANY($1::text[]) 
              OR COALESCE(reference_number::text, '') = ANY($1::text[]) 
              OR COALESCE(assigned_id_number::text, '') = ANY($1::text[]) 
              OR COALESCE(user_id::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(first_name, '')) = $3 AND LOWER(COALESCE(last_name, '')) = $4))
           ORDER BY created_at DESC`,
          [identifiers, userEmail, userFn, userLn]
        );
        pwdRes.rows.forEach((app) => {
          const st = String(app.status || "").toLowerCase();
          if (st === 'approved' || st === 'rejected' || st === 'completed' || st === 'for_release') {
            const notifId = `pwd-${app.id || app.reference_number}-${st}`;
            const appDate = app.approved_date || app.created_at;
            if (!isItemDismissed(notifId, appDate)) {
              const isApproved = st === 'approved' || st === 'completed' || st === 'for_release';
              const isSenior = (app.category || '').toLowerCase().includes('senior');
              const isAssistance = String(app.service || app.category || '').toLowerCase().includes('assistance');
              const isRenewal = String(app.application_type || '').toLowerCase() === 'renewal';
              const isLoss = String(app.application_type || '').toLowerCase() === 'replacement' || String(app.application_type || '').toLowerCase() === 'loss';

              let title = '';
              let serviceLabel = '';
              if (isAssistance) {
                serviceLabel = isSenior ? 'Senior Citizen Social Assistance' : 'PWD Social Assistance';
                title = isApproved ? `${serviceLabel} Application: Approved` : `${serviceLabel} Application: Not Approved`;
              } else if (isSenior) {
                serviceLabel = `Senior Citizen Services (${isRenewal ? 'Renewal' : isLoss ? 'Replacement' : 'New Application'})`;
                title = isApproved
                  ? (isRenewal ? 'Senior Citizen ID (Renewal): Approved' : isLoss ? 'Senior Citizen ID (Replacement): Approved' : 'Senior Citizen ID Application: Approved')
                  : 'Senior Citizen ID Application: Not Approved';
              } else {
                serviceLabel = `PWD Services (${isRenewal ? 'Renewal' : isLoss ? 'Replacement' : 'New Application'})`;
                title = isApproved
                  ? (isRenewal ? 'PWD ID (Renewal): Approved' : isLoss ? 'PWD ID (Replacement): Approved' : 'PWD ID Application: Approved')
                  : 'PWD ID Application: Not Approved';
              }

              items.push({
                id: notifId,
                title,
                desc: `${serviceLabel} — Ref: ${app.assigned_id_number || app.reference_number || app.id}`,
                time: formatManilaTime(appDate),
                unread: userStateMap[notifId]?.is_read !== undefined ? !userStateMap[notifId].is_read : true,
                reason: app.rejection_reason || null,
                reference_no: app.assigned_id_number || app.reference_number || app.id,
                created_at: appDate,
              });
            }
          }
        });
      } catch (_) {}
    }

    // 5. Fetch Solo Parent applications notifications
    if (identifiers.length > 0 || userEmail || (userFn && userLn)) {
      try {
        const spRes = await db.query(
          `SELECT id, reference_number, user_id, qcid_number, application_status, rejection_reason, created_at, updated_at, email, assigned_id_number, solo_parent_id_number, application_type
           FROM solo_parent_applications 
           WHERE (COALESCE(user_id::text, '') = ANY($1::text[]) 
              OR COALESCE(qcid_number::text, '') = ANY($1::text[]) 
              OR COALESCE(reference_number::text, '') = ANY($1::text[]) 
              OR COALESCE(assigned_id_number::text, '') = ANY($1::text[]) 
              OR COALESCE(solo_parent_id_number::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(first_name, '')) = $3 AND LOWER(COALESCE(last_name, '')) = $4))
           ORDER BY created_at DESC`,
          [identifiers, userEmail, userFn, userLn]
        );
        spRes.rows.forEach((app) => {
          const st = String(app.application_status || '').toLowerCase();
          if (st === 'approved' || st === 'rejected' || st === 'completed' || st === 'for_release') {
            const notifId = `sp-${app.id || app.reference_number}-${st}`;
            const appDate = app.updated_at || app.created_at;
            if (!isItemDismissed(notifId, appDate)) {
              const isApproved = st === 'approved' || st === 'completed' || st === 'for_release';
              const idNum = app.assigned_id_number || app.solo_parent_id_number || app.reference_number;
              const isRenewal = String(app.application_type || '').toLowerCase() === 'renewal';
              const isLoss = String(app.application_type || '').toLowerCase() === 'replacement' || String(app.application_type || '').toLowerCase() === 'loss';

              let title = '';
              if (isApproved) {
                title = isRenewal ? 'Solo Parent ID (Renewal): Approved' : isLoss ? 'Solo Parent ID (Replacement): Approved' : 'Solo Parent Application: Approved';
              } else {
                title = isRenewal ? 'Solo Parent ID (Renewal): Not Approved' : isLoss ? 'Solo Parent ID (Replacement): Not Approved' : 'Solo Parent Application: Not Approved';
              }

              items.push({
                id: notifId,
                title,
                desc: isApproved
                  ? `Congratulations! Your Solo Parent ID application (ID No. ${idNum}) has been approved and forwarded to Appointments for claiming schedule.`
                  : `Solo Parent Application: ${app.rejection_reason || 'Not approved'} (Ref: ${app.reference_number})`,
                time: formatManilaTime(appDate),
                unread: userStateMap[notifId]?.is_read !== undefined ? !userStateMap[notifId].is_read : true,
                reason: app.rejection_reason || null,
                reference_no: idNum,
                created_at: appDate,
              });
            }
          }
        });
      } catch (_) {}
    }

    // 6. Fetch Child Welfare applications notifications
    if (identifiers.length > 0 || userEmail || (userFn && userLn)) {
      try {
        const cwRes = await db.query(
          `SELECT id, reference_number, user_id, application_status, rejection_reason, created_at, updated_at, guardian_email, category_title, approved_amount, form_data
           FROM child_welfare_applications 
           WHERE (COALESCE(user_id::text, '') = ANY($1::text[]) OR COALESCE(reference_number::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(guardian_email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(guardian_first_name, '')) = $3 AND LOWER(COALESCE(guardian_last_name, '')) = $4))
           ORDER BY created_at DESC`,
          [identifiers, userEmail, userFn, userLn]
        );
        cwRes.rows.forEach((app) => {
          const st = String(app.application_status || '').toLowerCase();
          if (st === 'approved' || st === 'rejected' || st === 'completed' || st === 'for_release') {
            const notifId = `cw-${app.id || app.reference_number}-${st}`;
            const appDate = app.updated_at || app.created_at;
            if (!isItemDismissed(notifId, appDate)) {
              const isApproved = st === 'approved' || st === 'completed' || st === 'for_release';
              const programName = app.category_title || 'Child Welfare Assistance';
              items.push({
                id: notifId,
                title: isApproved ? `Child Welfare (${programName}): Approved` : `Child Welfare (${programName}): Not Approved`,
                desc: isApproved
                  ? `Congratulations! Your application for ${programName} (Ref: ${app.reference_number}) has been approved for ₱${(Number(app.approved_amount) || 5000).toLocaleString()} financial grant.`
                  : `Child Welfare (${programName}): ${app.rejection_reason || 'Not approved'} (Ref: ${app.reference_number})`,
                time: formatManilaTime(appDate),
                unread: userStateMap[notifId]?.is_read !== undefined ? !userStateMap[notifId].is_read : true,
                reason: app.rejection_reason || null,
                reference_no: app.reference_number,
                created_at: appDate,
              });
            }
          }
        });
      } catch (_) {}
    }

    // 7. Fetch Livelihood applications notifications
    if (identifiers.length > 0 || userEmail || (userFn && userLn)) {
      try {
        const livRes = await db.query(
          `SELECT id, reference_number, user_id, qcid, application_status, rejection_reason, created_at, updated_at, email, livelihood_type
           FROM livelihood_applications 
           WHERE (COALESCE(qcid::text, '') = ANY($1::text[]) 
              OR COALESCE(user_id::text, '') = ANY($1::text[]) 
              OR COALESCE(reference_number::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(first_name, '')) = $3 AND LOWER(COALESCE(last_name, '')) = $4))
           ORDER BY created_at DESC`,
          [identifiers, userEmail, userFn, userLn]
        );
        livRes.rows.forEach((app) => {
          const st = String(app.application_status || '').toLowerCase();
          if (st === 'approved' || st === 'rejected' || st === 'needs_revision' || st === 'for_release' || st === 'released') {
            const notifId = `liv-${app.id || app.reference_number}-${st}`;
            const appDate = app.updated_at || app.created_at;
            if (!isItemDismissed(notifId, appDate)) {
              const isApproved = st === 'approved' || st === 'for_release' || st === 'released';
              items.push({
                id: notifId,
                title: isApproved ? 'Livelihood & Training Application: Approved' : st === 'needs_revision' ? 'Livelihood Application: Needs Revision' : 'Livelihood & Training Application: Not Approved',
                desc: `${app.livelihood_type || 'Livelihood Program'} — Ref: ${app.reference_number}`,
                time: formatManilaTime(appDate),
                unread: userStateMap[notifId]?.is_read !== undefined ? !userStateMap[notifId].is_read : true,
                reason: app.rejection_reason || null,
                reference_no: app.reference_number,
                created_at: appDate,
              });
            }
          }
        });
      } catch (_) {}
    }

    // 7.1. Fetch Training Program applications notifications
    if (identifiers.length > 0 || userEmail || (userFn && userLn)) {
      try {
        const trnRes = await db.query(
          `SELECT id, reference_number, user_id, qcid, training_id, training_name, applicant_info, status, rejection_reason, revision_notes, created_at, updated_at
           FROM training_applications
           WHERE (COALESCE(qcid::text, '') = ANY($1::text[]) 
              OR COALESCE(user_id::text, '') = ANY($1::text[]) 
              OR COALESCE(reference_number::text, '') = ANY($1::text[]))
              OR (COALESCE(applicant_info::text, '') ILIKE '%' || $2 || '%' AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (COALESCE(applicant_info::text, '') ILIKE '%' || $3 || '%' AND COALESCE(applicant_info::text, '') ILIKE '%' || $4 || '%'))
           ORDER BY created_at DESC`,
          [identifiers, userEmail, userFn, userLn]
        );
        trnRes.rows.forEach((app) => {
          const appStatus = (app.status || '').toLowerCase();
          if (appStatus === 'approved' || appStatus === 'rejected' || appStatus === 'needs_revision' || appStatus === 'enrolled' || appStatus === 'completed') {
            const notifId = `trn-${app.id}-${appStatus}`;
            const appDate = app.updated_at || app.created_at || new Date().toISOString();
            if (!isItemDismissed(notifId, appDate)) {
              const isApproved = appStatus === 'approved' || appStatus === 'enrolled' || appStatus === 'completed';
              items.push({
                id: notifId,
                title: isApproved ? 'Gov Services Training: Approved' : appStatus === 'needs_revision' ? 'Gov Services Training: Needs Revision' : 'Gov Services Training: Not Approved',
                desc: `${app.training_name || 'Skills Training'} — Ref: ${app.reference_number || app.qcid}`,
                time: formatManilaTime(appDate),
                unread: userStateMap[notifId]?.is_read !== undefined ? !userStateMap[notifId].is_read : true,
                reason: app.rejection_reason || null,
                reference_no: app.reference_number || app.qcid,
                created_at: appDate,
              });
            }
          }
        });
      } catch (_) {}
    }

    // 7.2. Fetch PWD & Senior Citizen applications notifications
    if (identifiers.length > 0 || userEmail || (userFn && userLn)) {
      try {
        const pwdSeniorRes = await db.query(
          `SELECT id, reference_number, category, type, status, assigned_id_number, rejection_reason, created_at, submitted_at, email, first_name, last_name, extra_data
           FROM pwd_senior_applications
           WHERE (COALESCE(reference_number::text, '') = ANY($1::text[]) 
              OR COALESCE(id::text, '') = ANY($1::text[])
              OR COALESCE(assigned_id_number::text, '') = ANY($1::text[]))
              OR (LOWER(COALESCE(email, '')) = $2 AND $2 != '')
              OR ($3 != '' AND $4 != '' AND (LOWER(COALESCE(first_name, '')) = $3 AND LOWER(COALESCE(last_name, '')) = $4))
           ORDER BY created_at DESC`,
          [identifiers, userEmail, userFn, userLn]
        );
        pwdSeniorRes.rows.forEach((app) => {
          const st = String(app.status || '').toLowerCase();
          if (st === 'approved' || st === 'rejected' || st === 'disapproved' || st === 'completed' || st === 'for_release') {
            const notifId = `pwd-senior-${app.id || app.reference_number}-${st}`;
            const appDate = app.submitted_at || app.created_at || new Date().toISOString();
            if (!isItemDismissed(notifId, appDate)) {
              const isApproved = st === 'approved' || st === 'completed' || st === 'for_release';
              const isPwd = String(app.category || '').toUpperCase().includes('PWD');
              const typeStr = String(app.type || 'new').toLowerCase();
              const serviceTitle = isPwd
                ? typeStr === 'assistance'
                  ? 'PWD Social Assistance'
                  : typeStr === 'renewal'
                  ? 'PWD ID Renewal'
                  : typeStr === 'loss' || typeStr === 'replacement'
                  ? 'PWD ID Replacement'
                  : 'PWD ID'
                : typeStr === 'medicine-booklet'
                ? 'Senior Citizen Medicine Discount Booklet'
                : typeStr === 'movie-booklet'
                ? 'Senior Citizen Movie Booklet'
                : typeStr === 'social-assistance'
                ? 'Senior Citizen Social Assistance'
                : typeStr === 'renewal'
                ? 'Senior Citizen ID Renewal'
                : typeStr === 'loss' || typeStr === 'replacement'
                ? 'Senior Citizen ID Replacement'
                : 'Senior Citizen ID';

              items.push({
                id: notifId,
                title: isApproved ? `${serviceTitle}: Approved` : `${serviceTitle}: Not Approved`,
                desc: isApproved
                  ? `Congratulations! Your application for ${serviceTitle} (Ref: ${app.reference_number || app.assigned_id_number || 'N/A'}) has been approved.`
                  : `${serviceTitle}: ${app.rejection_reason ? `Tinanggihan dahil sa ${app.rejection_reason}` : 'Hindi naaprubahan ang inyong aplikasyon.'} (Ref: ${app.reference_number})`,
                time: formatManilaTime(appDate),
                unread: userStateMap[notifId]?.is_read !== undefined ? !userStateMap[notifId].is_read : true,
                reason: app.rejection_reason || null,
                reference_no: app.assigned_id_number || app.reference_number,
                created_at: appDate,
              });
            }
          }
        });
      } catch (_) {}
    }

    // 8. Fetch Financial Aid Disbursements & Scheduled Appointments Payouts
    if (identifiers.length > 0 || (userFn && userLn)) {
      try {
        const disbRes = await db.query(
          `SELECT f.*, a.scheduled_date, a.scheduled_time, a.office_location, a.status as appt_status
           FROM financial_aid_disbursements f
           LEFT JOIN (
             SELECT DISTINCT ON (reference_no) *
             FROM appointments
             ORDER BY reference_no, created_at DESC
           ) a ON f.application_ref = a.reference_no
           WHERE (COALESCE(f.application_ref::text, '') = ANY($1::text[]) OR COALESCE(a.reference_no::text, '') = ANY($1::text[]))
              OR ($2 != '' AND $3 != '' AND (LOWER(COALESCE(f.applicant_name, '')) ILIKE '%' || $2 || '%' AND LOWER(COALESCE(f.applicant_name, '')) ILIKE '%' || $3 || '%'))`,
          [identifiers, userFn, userLn]
        );

        disbRes.rows.forEach((d) => {
          const apptDate = d.scheduled_date || d.appointment_date;
          const apptTime = d.scheduled_time || d.appointment_time;
          const venue = d.office_location || d.venue || 'Quezon City Hall';
          const disbDate = d.updated_at || d.created_at;

          // Scheduled Appointment Notification
          if (apptDate) {
            const notifId = `disb-appt-${d.id || d.disbursement_id}-${apptDate}`;
            if (!isItemDismissed(notifId, disbDate)) {
              items.push({
                id: notifId,
                title: 'Payout Appointment Scheduled',
                desc: `Scheduled on ${apptDate} ${apptTime ? `at ${apptTime}` : ''} at ${venue} (Ref: ${d.application_ref})`,
                time: formatManilaTime(disbDate),
                unread: userStateMap[notifId]?.is_read !== undefined ? !userStateMap[notifId].is_read : true,
                reference_no: d.application_ref,
                created_at: disbDate,
              });
            }
          }

          // Released Notification
          if (d.status === 'RELEASED' || d.appt_status === 'completed') {
            const notifId = `disb-rel-${d.id || d.disbursement_id}`;
            const relDate = d.released_date || d.updated_at || d.created_at;
            if (!isItemDismissed(notifId, relDate)) {
              items.push({
                id: notifId,
                title: 'Financial Aid Released',
                desc: `₱${Number(d.fixed_amount || 15000).toLocaleString()} financial aid officially released at ${venue}.`,
                time: formatManilaTime(relDate),
                unread: userStateMap[notifId]?.is_read !== undefined ? !userStateMap[notifId].is_read : true,
                reference_no: d.application_ref,
                created_at: relDate,
              });
            }
          }
        });
      } catch (_) {}
    }

    // Deduplicate intelligently by canonical key (normalized title + reference_no or ID)
    const uniqueMap = new Map();
    items.forEach((item) => {
      const cleanRef = String(item.reference_no || '').trim().toUpperCase();
      const cleanTitle = String(item.title || '').trim().toLowerCase();
      const canonicalKey = cleanRef ? `${cleanTitle}::${cleanRef}` : item.id;

      if (!uniqueMap.has(canonicalKey)) {
        uniqueMap.set(canonicalKey, item);
      } else {
        const existing = uniqueMap.get(canonicalKey);
        const existingTime = new Date(existing.created_at || 0).getTime();
        const newTime = new Date(item.created_at || 0).getTime();
        // If either copy was marked as read, preserve the read status
        const isRead = !existing.unread || !item.unread;
        if (newTime >= existingTime) {
          uniqueMap.set(canonicalKey, {
            ...item,
            unread: !isRead,
          });
        } else {
          uniqueMap.set(canonicalKey, {
            ...existing,
            unread: !isRead,
          });
        }
      }
    });

    const finalNotifications = Array.from(uniqueMap.values()).sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return res.json({ success: true, notifications: finalNotifications });
  } catch (err) {
    console.error('Error in getNotifications:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications', details: err.message });
  }
};

// POST /api/notifications
exports.createNotification = async (req, res) => {
  try {
    const { userId, title, description, applicationRef } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }
    const result = await db.query(
      `INSERT INTO user_notifications (user_id, title, description, application_ref)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId || null, title, description, applicationRef || null]
    );
    res.status(201).json({ success: true, message: 'Notification created.', notification: result.rows[0] });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ success: false, error: 'Failed to create notification.' });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const identifiers = extractIdentifiers(req);
    const primaryIdent = identifiers[0] || 'default_user';

    if (id && id.startsWith('db-notif-')) {
      const dbId = id.replace('db-notif-', '');
      try {
        await db.query(`UPDATE user_notifications SET is_read = true WHERE id::text = $1`, [dbId]);
      } catch (_) {}
    }

    const targetIdentifiers = identifiers.length > 0 ? identifiers : [primaryIdent];
    for (const ident of targetIdentifiers) {
      try {
        await db.query(
          `INSERT INTO user_notification_state (user_identifier, notif_id, is_read, is_dismissed, updated_at)
           VALUES ($1, $2, true, false, NOW())
           ON CONFLICT (user_identifier, notif_id)
           DO UPDATE SET is_read = true, updated_at = NOW()`,
          [ident, id]
        );
      } catch (insertErr) {
        try {
          const upd = await db.query(
            `UPDATE user_notification_state SET is_read = true, updated_at = NOW() WHERE user_identifier = $1 AND notif_id = $2`,
            [ident, id]
          );
          if (upd.rowCount === 0) {
            await db.query(
              `INSERT INTO user_notification_state (user_identifier, notif_id, is_read, is_dismissed, updated_at) VALUES ($1, $2, true, false, NOW())`,
              [ident, id]
            );
          }
        } catch (_) {}
      }
    }

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Error updating notification read state:', err);
    return res.status(200).json({ success: true, message: 'Notification marked as read locally.' });
  }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    const identifiers = extractIdentifiers(req);
    const { notifIds = [] } = req.body;
    const primaryIdent = identifiers[0] || 'default_user';
    const targetIdentifiers = identifiers.length > 0 ? identifiers : [primaryIdent];

    if (Array.isArray(notifIds) && notifIds.length > 0) {
      for (const notifId of notifIds) {
        if (notifId && notifId.startsWith('db-notif-')) {
          const dbId = notifId.replace('db-notif-', '');
          try {
            await db.query(`UPDATE user_notifications SET is_read = true WHERE id::text = $1`, [dbId]);
          } catch (_) {}
        }

        for (const ident of targetIdentifiers) {
          try {
            await db.query(
              `INSERT INTO user_notification_state (user_identifier, notif_id, is_read, is_dismissed, updated_at)
               VALUES ($1, $2, true, false, NOW())
               ON CONFLICT (user_identifier, notif_id)
               DO UPDATE SET is_read = true, updated_at = NOW()`,
              [ident, notifId]
            );
          } catch (_) {
            try {
              await db.query(
                `UPDATE user_notification_state SET is_read = true, updated_at = NOW() WHERE user_identifier = $1 AND notif_id = $2`,
                [ident, notifId]
              );
            } catch (_) {}
          }
        }
      }
    }

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return res.status(200).json({ success: true, message: 'All notifications marked as read locally.' });
  }
};

// DELETE /api/notifications/:id
exports.dismissNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const identifiers = extractIdentifiers(req);
    const primaryIdent = identifiers[0] || 'default_user';

    if (id && id.startsWith('db-notif-')) {
      const dbId = id.replace('db-notif-', '');
      try {
        await db.query(`UPDATE user_notifications SET is_dismissed = true WHERE id::text = $1`, [dbId]);
      } catch (_) {}
    }

    const targetIdentifiers = identifiers.length > 0 ? identifiers : [primaryIdent];
    for (const ident of targetIdentifiers) {
      try {
        await db.query(
          `INSERT INTO user_notification_state (user_identifier, notif_id, is_read, is_dismissed, updated_at)
           VALUES ($1, $2, true, true, NOW())
           ON CONFLICT (user_identifier, notif_id)
           DO UPDATE SET is_dismissed = true, updated_at = NOW()`,
          [ident, id]
        );
      } catch (insertErr) {
        try {
          const upd = await db.query(
            `UPDATE user_notification_state SET is_dismissed = true, updated_at = NOW() WHERE user_identifier = $1 AND notif_id = $2`,
            [ident, id]
          );
          if (upd.rowCount === 0) {
            await db.query(
              `INSERT INTO user_notification_state (user_identifier, notif_id, is_read, is_dismissed, updated_at) VALUES ($1, $2, true, true, NOW())`,
              [ident, id]
            );
          }
        } catch (_) {}
      }
    }

    return res.json({ success: true, message: 'Notification dismissed.' });
  } catch (err) {
    console.error('Error dismissing notification:', err);
    return res.status(200).json({ success: true, message: 'Notification dismissed locally.' });
  }
};

// DELETE /api/notifications/all
exports.dismissAllNotifications = async (req, res) => {
  try {
    const identifiers = extractIdentifiers(req);
    const { notifIds = [] } = req.body || req.query;
    const primaryIdent = identifiers[0] || 'default_user';
    const targetIdentifiers = identifiers.length > 0 ? identifiers : [primaryIdent];

    // 1. Mark __ALL__ with current timestamp for all identifiers
    for (const ident of targetIdentifiers) {
      try {
        await db.query(
          `INSERT INTO user_notification_state (user_identifier, notif_id, is_read, is_dismissed, updated_at)
           VALUES ($1, '__ALL__', true, true, NOW())
           ON CONFLICT (user_identifier, notif_id)
           DO UPDATE SET is_dismissed = true, updated_at = NOW()`,
          [ident]
        );
      } catch (_) {
        try {
          await db.query(
            `UPDATE user_notification_state SET is_dismissed = true, updated_at = NOW() WHERE user_identifier = $1 AND notif_id = '__ALL__'`,
            [ident]
          );
        } catch (_) {}
      }
    }

    // 2. Mark specific notifIds if provided
    if (Array.isArray(notifIds) && notifIds.length > 0) {
      for (const notifId of notifIds) {
        if (notifId && notifId.startsWith('db-notif-')) {
          const dbId = notifId.replace('db-notif-', '');
          try {
            await db.query(`UPDATE user_notifications SET is_dismissed = true WHERE id::text = $1`, [dbId]);
          } catch (_) {}
        }

        for (const ident of targetIdentifiers) {
          try {
            await db.query(
              `INSERT INTO user_notification_state (user_identifier, notif_id, is_read, is_dismissed, updated_at)
               VALUES ($1, $2, true, true, NOW())
               ON CONFLICT (user_identifier, notif_id)
               DO UPDATE SET is_dismissed = true, updated_at = NOW()`,
              [ident, notifId]
            );
          } catch (_) {}
        }
      }
    }

    // 3. Mark direct user_notifications as dismissed
    if (identifiers.length > 0) {
      try {
        await db.query(
          `UPDATE user_notifications SET is_dismissed = true 
           WHERE COALESCE(user_id::text, '') = ANY($1::text[]) OR COALESCE(application_ref::text, '') = ANY($1::text[])`,
          [identifiers]
        );
      } catch (_) {}
    }

    return res.json({ success: true, message: 'All notifications dismissed.' });
  } catch (err) {
    console.error('Error dismissing all notifications:', err);
    return res.status(200).json({ success: true, message: 'All notifications dismissed locally.' });
  }
};
