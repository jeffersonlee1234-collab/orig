const db = require('../config/db');
const { logActivity } = require('./activityLogController');

const FIXED_ASSISTANCE_AMOUNTS = {
  'Medical Assistance': 5000,
  'Funeral Assistance': 10000,
  'Educational Assistance': 3000,
  'Burial Assistance': 10000,
  'Food Assistance': 1500,
  'Transportation Assistance': 1000,
  'PWD Social Assistance': 2000,
  'Senior Social Assistance': 2000,
  'Child Welfare Support': 5000,
  'Nutritional Assistance': 5000,
  'Nutritional Assistance (Child Welfare)': 5000,
  'Child Protection Assistance': 5000,
  'Emergency Assistance': 5000,
  'Child Welfare Assistance': 5000,
  'Solo Parent Welfare Assistance': 5000,
  'Solo Parent Assistance': 5000,
  'Livelihood Capital Assistance': 15000,
  'Livelihood Assistance': 15000,
  'Livelihood Program': 15000,
};

function resolveFixedAmount(concern) {
  if (!concern) return 5000;
  const c = String(concern).trim();
  if (FIXED_ASSISTANCE_AMOUNTS[c]) return FIXED_ASSISTANCE_AMOUNTS[c];
  const clean = c.replace(/\s*assistance/gi, '').trim();
  const formatted = clean.charAt(0).toUpperCase() + clean.slice(1) + ' Assistance';
  if (FIXED_ASSISTANCE_AMOUNTS[formatted]) return FIXED_ASSISTANCE_AMOUNTS[formatted];

  const lower = c.toLowerCase();
  if (lower.includes('funeral') || lower.includes('burial')) return 10000;
  if (lower.includes('livelihood')) return 15000;
  if (lower.includes('nutrition') || lower.includes('child') || lower.includes('medical') || lower.includes('emergency') || lower.includes('solo')) return 5000;
  if (lower.includes('education')) return 3000;
  if (lower.includes('pwd') || lower.includes('senior')) return 2000;
  if (lower.includes('food')) return 1500;
  if (lower.includes('transport')) return 1000;
  return 5000;
}

// Helper: parse date and time string to Date object in Philippine Standard Time (UTC+8)
function parseDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  try {
    let year, month, day;

    const str = String(dateStr).trim();
    const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10) - 1;
      day = parseInt(isoMatch[3], 10);
    } else {
      const usMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (usMatch) {
        month = parseInt(usMatch[1], 10) - 1;
        day = parseInt(usMatch[2], 10);
        year = parseInt(usMatch[3], 10);
      } else {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
      }
    }

    let hours = 9;
    let minutes = 0;

    if (timeStr) {
      const match = String(timeStr).trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
      }
    }

    const targetUtcMs = Date.UTC(year, month, day, hours - 8, minutes, 0, 0);
    return new Date(targetUtcMs);
  } catch {
    return null;
  }
}

// Background auto-release check
async function autoReleaseScheduledDisbursements() {
  try {
    const result = await db.query(
      `SELECT f.*, COALESCE(a.scheduled_date, f.appointment_date) as final_appt_date, COALESCE(a.scheduled_time, f.appointment_time) as final_appt_time
       FROM financial_aid_disbursements f
       LEFT JOIN appointments a ON f.application_ref = a.reference_no
       WHERE f.status = 'PENDING' OR a.status = 'scheduled'`
    );

    const now = new Date();
    for (const d of result.rows) {
      const apptDate = d.final_appt_date || d.appointment_date;
      const apptTime = d.final_appt_time || d.appointment_time;

      if (!apptDate) continue;

      const scheduledDt = parseDateTime(apptDate, apptTime);
      if (scheduledDt && now.getTime() >= scheduledDt.getTime()) {
        const releaseTime = apptTime || now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
        const releaseDate = now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

        // 1. Mark Financial Aid as RELEASED
        if (d.status === 'PENDING') {
          await db.query(
            `UPDATE financial_aid_disbursements
             SET status = 'RELEASED',
                 released_date = $1,
                 released_by = 'Automated Scheduled Payout System / Disbursing Officer',
                 remarks = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [`${releaseDate} ${releaseTime}`, `Awtomatikong na-release sa takdang oras ng appointment (${apptDate} - ${releaseTime}).`, d.id]
          );

          // 2. Add Notification
          await db.query(
            `INSERT INTO user_notifications (title, description, application_ref)
             VALUES ($1, $2, $3)`,
            [
              'Financial Aid Released',
              `Your Financial Aid (${d.assistance_type} — ₱${Number(d.fixed_amount).toLocaleString()}) has been automatically released at the scheduled appointment time (${apptDate} – ${releaseTime}).`,
              d.application_ref,
            ]
          );

          // 3. Log Activity
          await logActivity({
            actor: 'System Auto-Release',
            actorRole: 'Automated Worker',
            action: 'RELEASED',
            module: 'Financial Aid',
            referenceNo: d.application_ref,
            subject: d.applicant_name,
            detail: `Automated financial aid payout released for ${d.assistance_type} (₱${Number(d.fixed_amount).toLocaleString()}).`,
          });

          // 4. If this is a Livelihood assistance disbursement, also update livelihood_assistance & auto-activate monitoring
          if (d.application_ref && (d.application_ref.startsWith('LP-') || (d.assistance_type && d.assistance_type.includes('Livelihood')))) {
            await db.query(
              `UPDATE livelihood_assistance
               SET assistance_status = 'released',
                   release_date = COALESCE(release_date, $1),
                   release_time = COALESCE(release_time, $2),
                   release_location = COALESCE(release_location, $3),
                   released_at = NOW(),
                   released_by = 'Automated Scheduled Payout System / Disbursing Officer',
                   updated_at = NOW()
               WHERE reference_number = $4`,
              [apptDate, releaseTime, d.venue || 'Quezon City Hall - SSDD Livelihood Center', d.application_ref]
            );

            const appRes = await db.query('SELECT id FROM livelihood_applications WHERE reference_number = $1', [d.application_ref]);
            if (appRes.rows.length > 0) {
              const appId = appRes.rows[0].id;
              const monCheck = await db.query('SELECT id FROM livelihood_monitoring WHERE application_id = $1', [appId]);
              if (monCheck.rows.length === 0) {
                await db.query(
                  `INSERT INTO livelihood_monitoring (
                    application_id, reference_number, monitoring_status, log_type,
                    title, notes, officer_name, inspection_date
                  ) VALUES ($1, $2, 'active', 'inspection', $3, $4, $5, $6)`,
                  [
                    appId,
                    d.application_ref,
                    'Initial Assistance Release & Monitoring Setup',
                    `Capital / Materials assistance automatically released via Financial Aid appointment payout (${apptDate} – ${releaseTime}). Active monitoring initiated.`,
                    'Automated Scheduled Payout System',
                    now.toISOString().split('T')[0],
                  ]
                );
              }
            }
          }
        }

        // 5. Mark Appointment as COMPLETED
        await db.query(
          `UPDATE appointments
           SET status = 'completed',
               updated_at = NOW()
           WHERE reference_no = $1 AND status != 'completed'`,
          [d.application_ref]
        );
      }
    }
  } catch (err) {
    console.warn('Auto-release worker check note:', err.message);
  }
}

// GET /api/financial-aid
exports.getDisbursements = async (req, res) => {
  try {
    await autoReleaseScheduledDisbursements();

    // Auto-clean any ID card issuances from disbursements (only financial/social assistance is disbursed)
    try {
      await db.query(`
        DELETE FROM financial_aid_disbursements
        WHERE assistance_type ILIKE '%ID Card%' OR assistance_type ILIKE '%Issuance%'
      `);
    } catch (_) {}

    // Auto-correct any disbursements where fixed_amount was mistakenly set to 1000 instead of 5000
    try {
      await db.query(`
        UPDATE financial_aid_disbursements
        SET fixed_amount = 5000
        WHERE (fixed_amount = 1000 OR fixed_amount IS NULL)
          AND (
            assistance_type ILIKE '%nutrition%'
            OR assistance_type ILIKE '%child%'
            OR assistance_type ILIKE '%medical%'
            OR assistance_type ILIKE '%solo%'
            OR assistance_type ILIKE '%emergency%'
          )
      `);
    } catch (_) {}

    // Auto-clean any duplicate disbursements (keep newest by highest id)
    try {
      await db.query(`
        DELETE FROM financial_aid_disbursements f1
        USING financial_aid_disbursements f2
        WHERE f1.id < f2.id AND f1.application_ref = f2.application_ref
      `);
    } catch (_) {}

    // Auto-clean any orphan disbursements that do not exist in active approved applications
    try {
      await db.query(`
        DELETE FROM financial_aid_disbursements
        WHERE (
          application_ref NOT IN (
            SELECT reference_number FROM pwd_senior_applications WHERE status IN ('approved', 'completed', 'for_release')
          )
          AND application_ref NOT IN (
            SELECT reference_no FROM aics_applications WHERE status IN ('approved', 'completed', 'for_release')
          )
          AND application_ref NOT IN (
            SELECT l.reference_number 
            FROM livelihood_applications l
            INNER JOIN livelihood_assistance la ON l.reference_number = la.reference_number
            WHERE (l.application_status = 'approved' OR l.status = 'approved')
              AND la.assistance_status IN ('for_release', 'released', 'FOR RELEASE', 'RELEASED')
          )
          AND application_ref NOT IN (
            SELECT reference_number FROM solo_parent_applications WHERE application_status = 'approved'
          )
          AND application_ref NOT IN (
            SELECT reference_number FROM child_welfare_applications WHERE application_status = 'approved'
          )
        )
      `);
    } catch (_) {}

    // Auto-populate disbursements from approved livelihood applications whose capital assistance is ready for release
    try {
      const approvedLivelihood = await db.query(
        `SELECT l.reference_number, l.first_name, l.last_name, l.estimated_amount 
         FROM livelihood_applications l
         INNER JOIN livelihood_assistance la ON l.reference_number = la.reference_number
         WHERE l.application_status = 'approved' 
           AND (la.assistance_status = 'for_release' OR la.assistance_status = 'released' OR la.assistance_status = 'FOR RELEASE' OR la.assistance_status = 'RELEASED')`
      );
      for (const row of approvedLivelihood.rows) {
        const disbCheck = await db.query(
          'SELECT id FROM financial_aid_disbursements WHERE application_ref = $1',
          [row.reference_number]
        );
        if (disbCheck.rows.length === 0) {
          const disbId = `DISB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const fullName = `${row.first_name || ''} ${row.last_name || ''}`.trim().toUpperCase() || 'BENEFICIARY';
          await db.query(
            `INSERT INTO financial_aid_disbursements (
              disbursement_id, application_ref, applicant_name, assistance_type, fixed_amount,
              date_approved, status, venue, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
            ON CONFLICT DO NOTHING`,
            [
              disbId,
              row.reference_number,
              fullName,
              'Livelihood Capital Assistance',
              Number(row.estimated_amount) > 0 ? Number(row.estimated_amount) : 15000,
              new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
              'Quezon City Hall - SSDD Livelihood Center',
              'Approved Livelihood Seed Capital Assistance. Ready for Appointment scheduling and payout.',
            ]
          );
        }
      }

      // Fix any existing zero-amount livelihood disbursements
      await db.query(
        `UPDATE financial_aid_disbursements
         SET fixed_amount = 15000
         WHERE (fixed_amount::numeric = 0 OR fixed_amount IS NULL) AND assistance_type LIKE '%Livelihood%'`
      );
    } catch (_) {}

    // Auto-populate disbursements from approved PWD & Senior Citizen Social Assistance
    try {
      const approvedPwdAssistance = await db.query(
        `SELECT reference_number, category, type, first_name, middle_name, last_name, suffix, approved_date
         FROM pwd_senior_applications 
         WHERE status IN ('approved', 'completed', 'for_release') 
           AND (type ILIKE '%assist%' OR category ILIKE '%assist%' OR disability_class ILIKE '%assist%' OR service ILIKE '%assist%' OR extra_data ILIKE '%assist%')`
      );
      for (const row of approvedPwdAssistance.rows) {
        const disbCheck = await db.query(
          'SELECT id FROM financial_aid_disbursements WHERE application_ref = $1',
          [row.reference_number]
        );
        if (disbCheck.rows.length === 0) {
          const disbId = `DISB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const fullName = [row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(' ').trim().toUpperCase() || 'BENEFICIARY';
          const isPwd = String(row.category || '').toUpperCase().includes('PWD');
          const assistanceType = isPwd ? 'PWD Social Assistance' : 'Senior Social Assistance';
          await db.query(
            `INSERT INTO financial_aid_disbursements (
              disbursement_id, application_ref, applicant_name, assistance_type, fixed_amount,
              date_approved, status, venue, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
            ON CONFLICT DO NOTHING`,
            [
              disbId,
              row.reference_number,
              fullName,
              assistanceType,
              2000,
              row.approved_date || new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
              'Quezon City Hall',
              'Approved PWD/Senior Social Assistance. Ready for Appointment scheduling and payout.',
            ]
          );
        }
      }
    } catch (_) {}

    // Auto-populate disbursements from approved Child Welfare (Nutritional, Child Protection, Emergency Assistance)
    try {
      const approvedChildWelfare = await db.query(
        `SELECT reference_number, category_title, primary_reason_for_assistance, guardian_first_name, guardian_middle_name, guardian_last_name, approved_amount, updated_at, created_at
         FROM child_welfare_applications 
         WHERE application_status IN ('approved', 'completed', 'for_release')`
      );
      for (const row of approvedChildWelfare.rows) {
        const disbCheck = await db.query(
          'SELECT id FROM financial_aid_disbursements WHERE application_ref = $1',
          [row.reference_number]
        );
        if (disbCheck.rows.length === 0) {
          const disbId = `DISB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const fullName = [row.guardian_first_name, row.guardian_middle_name, row.guardian_last_name].filter(Boolean).join(' ').trim().toUpperCase() || 'GUARDIAN / BENEFICIARY';
          const title = row.category_title ? `${row.category_title} (Child Welfare)` : 'Child Welfare Assistance';
          const amount = Number(row.approved_amount) > 0 ? Number(row.approved_amount) : 5000;
          await db.query(
            `INSERT INTO financial_aid_disbursements (
              disbursement_id, application_ref, applicant_name, assistance_type, fixed_amount,
              date_approved, status, venue, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
            ON CONFLICT DO NOTHING`,
            [
              disbId,
              row.reference_number,
              fullName,
              title,
              amount,
              new Date(row.updated_at || row.created_at || Date.now()).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
              'Quezon City Hall - SSDD Child Welfare Section',
              'Approved Child Welfare financial grant. Ready for Appointment scheduling and payout.',
            ]
          );
        }
      }
    } catch (_) {}

    const result = await db.query(
      `SELECT
         f.id,
         f.disbursement_id,
         f.application_ref,
         f.applicant_name,
         f.assistance_type,
         CASE WHEN f.fixed_amount::numeric > 0 THEN f.fixed_amount::numeric ELSE 15000 END as fixed_amount,
         f.date_approved,
         CASE WHEN a.status = 'completed' OR f.status = 'RELEASED' THEN 'RELEASED' ELSE f.status END as status,
         COALESCE(a.scheduled_date, f.appointment_date) as appointment_date,
         COALESCE(a.scheduled_time, f.appointment_time) as appointment_time,
         COALESCE(a.office_location, f.venue) as venue,
         COALESCE(f.released_date, CASE WHEN a.status = 'completed' THEN CONCAT(COALESCE(a.scheduled_date, f.appointment_date), ' ', COALESCE(a.scheduled_time, f.appointment_time)) ELSE NULL END) as released_date,
         COALESCE(f.released_by, 'Automated Scheduled Payout System / Disbursing Officer') as released_by,
         f.remarks,
         f.created_at,
         f.updated_at
       FROM financial_aid_disbursements f
       LEFT JOIN (
         SELECT DISTINCT ON (reference_no) *
         FROM appointments
         ORDER BY reference_no, created_at DESC
       ) a ON f.application_ref = a.reference_no
       ORDER BY f.created_at DESC`
    );

    res.json({ disbursements: result.rows });
  } catch (err) {
    console.error('Error fetching disbursements:', err);
    res.status(500).json({ error: 'Failed to fetch financial aid disbursements.', details: err.message });
  }
};

// GET /api/financial-aid/user/:refOrQcId
exports.getUserDisbursements = async (req, res) => {
  try {
    await autoReleaseScheduledDisbursements();
    const { refOrQcId } = req.params;

    const result = await db.query(
      `SELECT
         f.id,
         f.disbursement_id,
         f.application_ref,
         f.applicant_name,
         f.assistance_type,
         f.fixed_amount,
         f.date_approved,
         CASE WHEN a.status = 'completed' OR f.status = 'RELEASED' THEN 'RELEASED' ELSE f.status END as status,
         COALESCE(a.scheduled_date, f.appointment_date) as appointment_date,
         COALESCE(a.scheduled_time, f.appointment_time) as appointment_time,
         COALESCE(a.office_location, f.venue) as venue,
         COALESCE(f.released_date, CASE WHEN a.status = 'completed' THEN CONCAT(COALESCE(a.scheduled_date, f.appointment_date), ' ', COALESCE(a.scheduled_time, f.appointment_time)) ELSE NULL END) as released_date,
         COALESCE(f.released_by, 'Automated Scheduled Payout System / Disbursing Officer') as released_by,
         f.remarks,
         f.created_at,
         f.updated_at
       FROM financial_aid_disbursements f
       LEFT JOIN (
         SELECT DISTINCT ON (reference_no) *
         FROM appointments
         ORDER BY reference_no, created_at DESC
       ) a ON f.application_ref = a.reference_no
       WHERE (f.application_ref = $1 OR f.applicant_name ILIKE $2)
       ORDER BY f.created_at DESC`,
      [refOrQcId, `%${refOrQcId}%`]
    );

    res.json({ disbursements: result.rows });
  } catch (err) {
    console.error('Error fetching user disbursements:', err);
    res.status(500).json({ error: 'Failed to fetch user financial aid disbursements.' });
  }
};


// POST /api/financial-aid/cleanup
exports.cleanupOrphanDisbursements = async (req, res) => {
  try {
    const result = await db.query(`
      DELETE FROM financial_aid_disbursements
      WHERE application_ref NOT IN (
        SELECT reference_no FROM aics_applications WHERE status IN ('approved', 'completed', 'for_release')
      )
      RETURNING *
    `);
    res.json({ message: 'Cleaned orphan records.', deletedCount: result.rowCount });
  } catch (err) {
    console.error('Error cleaning disbursements:', err);
    res.status(500).json({ error: 'Failed to clean disbursements.' });
  }
};

// POST /api/financial-aid
exports.createDisbursement = async (req, res) => {
  try {
    const {
      applicationRef,
      applicantName,
      assistanceType,
      fixedAmount,
      dateApproved,
      appointmentDate,
      appointmentTime,
      venue,
      remarks,
    } = req.body;

    if (!applicationRef || !applicantName || !assistanceType) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const cleanAssistance = assistanceType.includes('Assistance') ? assistanceType : `${assistanceType} Assistance`;
    const finalAmount = fixedAmount || resolveFixedAmount(assistanceType);
    const finalDateApproved = dateApproved || new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    const disbursementId = `DISB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await db.query(
      `INSERT INTO financial_aid_disbursements
        (disbursement_id, application_ref, applicant_name, assistance_type, fixed_amount,
         date_approved, status, appointment_date, appointment_time, venue, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9, $10)
       ON CONFLICT (disbursement_id) DO UPDATE
       SET updated_at = NOW()
       RETURNING *`,
      [
        disbursementId,
        applicationRef,
        applicantName.toUpperCase(),
        cleanAssistance,
        finalAmount,
        finalDateApproved,
        appointmentDate || null,
        appointmentTime || null,
        venue || 'Quezon City Hall',
        remarks || 'Automatic generated upon approval with scheduled payout appointment.',
      ]
    );

    res.status(201).json({ message: 'Disbursement created.', disbursement: result.rows[0] });
  } catch (err) {
    console.error('Error creating disbursement:', err);
    res.status(500).json({ error: 'Failed to create financial aid disbursement.' });
  }
};

// PUT /api/financial-aid/:id/release
exports.releaseDisbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const { releasedDate, releasedBy, venue, remarks } = req.body;

    const finalDate = releasedDate || new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const finalOfficer = releasedBy || 'Authorized Admin / Disbursing Officer';
    const finalVenue = venue || 'Quezon City Hall';
    const cleanId = String(id || '').trim();

    const result = await db.query(
      `UPDATE financial_aid_disbursements
       SET status = 'RELEASED',
           released_date = $1,
           released_by = $2,
           venue = $3,
           remarks = COALESCE($4, remarks),
           updated_at = NOW()
       WHERE id::text = $5 OR disbursement_id = $5 OR application_ref = $5
       RETURNING *`,
      [finalDate, finalOfficer, finalVenue, remarks, cleanId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Disbursement not found.' });
    }

    const d = result.rows[0];

    // Notification to citizen
    await db.query(
      `INSERT INTO user_notifications (title, description, application_ref)
       VALUES ($1, $2, $3)`,
      [
        'Financial Aid Released',
        `Your Financial Aid (${d.assistance_type} — ₱${Number(d.fixed_amount).toLocaleString()}) has been released successfully. Date: ${finalDate}.`,
        d.application_ref,
      ]
    );

    // Update appointment status to completed if matched
    await db.query(
      `UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE reference_no = $1`,
      [d.application_ref]
    );

    // Log activity
    await logActivity({
      actor: finalOfficer,
      actorRole: 'Disbursing Officer',
      action: 'RELEASED',
      module: 'Financial Aid',
      referenceNo: d.application_ref,
      subject: d.applicant_name,
      detail: `Financial aid released for ${d.assistance_type} (₱${Number(d.fixed_amount).toLocaleString()}).`,
    });

    res.json({ message: 'Disbursement released.', disbursement: d });
  } catch (err) {
    console.error('Error releasing disbursement:', err);
    res.status(500).json({ error: 'Failed to release financial aid.' });
  }
};

// DELETE /api/financial-aid/:id
exports.deleteDisbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const rawId = String(id || '').trim();
    const cleanId = rawId
      .replace(/^db-/, '')
      .replace(/^remote-pwd-/, '')
      .replace(/^remote-cw-/, '')
      .replace(/^remote-liv-/, '')
      .replace(/^remote-/, '')
      .trim();

    // Query matching row first to capture application_ref and applicant_name
    const found = await db.query(
      `SELECT application_ref, applicant_name, disbursement_id FROM financial_aid_disbursements 
       WHERE id::text = $1 OR id::text = $2 OR disbursement_id = $1 OR disbursement_id = $2 OR application_ref = $1 OR application_ref = $2`,
      [rawId, cleanId]
    );

    const appRef = found.rows[0]?.application_ref || cleanId;
    const applicantName = found.rows[0]?.applicant_name || '';

    // 1. Delete from financial_aid_disbursements table
    await db.query(
      `DELETE FROM financial_aid_disbursements 
       WHERE id::text = $1 OR id::text = $2 OR disbursement_id = $1 OR disbursement_id = $2 OR application_ref = $1 OR application_ref = $2`,
      [rawId, cleanId]
    );

    // 2. Also delete from underlying application tables so it does not auto-repopulate
    if (appRef) {
      await Promise.allSettled([
        db.query(`DELETE FROM child_welfare_applications WHERE reference_number = $1 OR id::text = $1`, [appRef]),
        db.query(`DELETE FROM pwd_senior_applications WHERE reference_number = $1 OR id::text = $1`, [appRef]),
        db.query(`DELETE FROM livelihood_applications WHERE reference_number = $1 OR id::text = $1`, [appRef]),
        db.query(`DELETE FROM aics_applications WHERE reference_no = $1 OR reference_number = $1 OR id::text = $1`, [appRef]),
        db.query(`DELETE FROM appointments WHERE reference_no = $1`, [appRef]),
      ]);
    }

    if (applicantName) {
      await Promise.allSettled([
        db.query(`DELETE FROM appointments WHERE applicant_name ILIKE $1`, [applicantName]),
      ]);
    }

    res.json({ message: 'Disbursement and associated records deleted successfully.' });
  } catch (err) {
    console.error('Error deleting disbursement:', err);
    res.status(500).json({ error: 'Failed to delete disbursement.' });
  }
};

// DELETE /api/financial-aid/cleanup-user/:nameOrRef
exports.deleteUserDisbursements = async (req, res) => {
  try {
    const { nameOrRef } = req.params;
    const term = `%${nameOrRef}%`;
    const result = await db.query(
      `DELETE FROM financial_aid_disbursements 
       WHERE applicant_name ILIKE $1 
          OR application_ref ILIKE $1
          OR disbursement_id ILIKE $1`,
      [term]
    );

    await Promise.allSettled([
      db.query(`DELETE FROM child_welfare_applications WHERE reference_number ILIKE $1 OR guardian_first_name ILIKE $1 OR guardian_last_name ILIKE $1`, [term]),
      db.query(`DELETE FROM pwd_senior_applications WHERE reference_number ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1`, [term]),
      db.query(`DELETE FROM livelihood_applications WHERE reference_number ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1`, [term]),
      db.query(`DELETE FROM aics_applications WHERE reference_no ILIKE $1 OR reference_number ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1`, [term]),
      db.query(`DELETE FROM appointments WHERE reference_no ILIKE $1 OR applicant_name ILIKE $1`, [term]),
    ]);

    res.json({ message: `Deleted ${result.rowCount} disbursements and associated applications.` });
  } catch (err) {
    console.error('Error clearing disbursements:', err);
    res.status(500).json({ error: 'Failed to clear disbursements.' });
  }
};

// Periodic runner export
exports.autoReleaseScheduledDisbursements = autoReleaseScheduledDisbursements;
