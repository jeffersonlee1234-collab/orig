// backend/controllers/trainingController.js
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

let logActivity = null;
try {
  const actCtrl = require('./activityLogController');
  logActivity = actCtrl.logActivity;
} catch {}

const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'training_applications.json');

const DEFAULT_TRAINING_COURSES = [
  {
    id: 'tr-sewing',
    title: 'Sewing Training',
    category: 'Livelihood & Skills Development',
    description: 'Matutunan ang pattern drafting, pananahi ng mga damit at kurtina, paggamit at pag-aalaga ng sewing machine, at paglikha ng mga produktong maaaring ibenta sa komunidad.',
    date: 'September 15, 2026 - September 18, 2026',
    time: '9:00 AM - 12:00 PM (3 Hours/Day)',
    location: 'Gov Services Skills Development Center, Batasan Hills',
    landmark: 'Tapat ng Puregold Batasan / Katabi ng Batasan Hills Barangay Hall',
    totalSlots: 25,
    availableSlots: 25,
    durationHours: 12,
    dailyHours: 3,
    totalDays: 4,
    instructor: 'Gng. Rosa Dimaculangan (Master Tailor)',
    prerequisites: 'Gov Services Resident (18 taong gulang pataas), may interes sa pananahi.',
    materialsProvided: 'Sewing fabric, thread kit, pattern paper, tracing wheel, measuring tape.',
  },
  {
    id: 'tr-cooking',
    title: 'Cooking Training',
    category: 'Livelihood & Skills Development',
    description: 'Matutunan ang commercial cooking, food safety & sanitation, paghahanda ng merienda at lutong ulam na patok sa karenderya, at tamang costing at pagpepresyo.',
    date: 'September 20, 2026 - September 23, 2026',
    time: '1:00 PM - 4:00 PM (3 Hours/Day)',
    location: 'Gov Services Skills Development Center, Batasan Hills',
    landmark: '3rd Floor Culinary Lab, malapit sa Batasan Hills Barangay Hall',
    totalSlots: 25,
    availableSlots: 25,
    durationHours: 12,
    dailyHours: 3,
    totalDays: 4,
    instructor: 'Chef Anthony Santos (Culinary Specialist)',
    prerequisites: 'Gov Services Resident, handang sumunod sa kitchen hygiene & food safety guidelines.',
    materialsProvided: 'Ingredients kit, cooking apron, hairnet, recipe guide booklet.',
  },
  {
    id: 'tr-beauty',
    title: 'Beauty Services Training',
    category: 'Livelihood & Skills Development',
    description: 'Pangunahing kasanayan sa haircutting at hairstyling, manicure/pedicure na may nail art, facial cleansing at basic cosmetology para sa salon o home-service livelihood.',
    date: 'September 24, 2026 - September 27, 2026',
    time: '9:00 AM - 12:00 PM (3 Hours/Day)',
    location: 'Gov Services Skills Development Center, Batasan Hills',
    landmark: 'Ground Floor Wellness Studio, tapat ng Puregold Batasan',
    totalSlots: 25,
    availableSlots: 25,
    durationHours: 12,
    dailyHours: 3,
    totalDays: 4,
    instructor: 'Bb. Cheryl Mendez (Certified Cosmetologist)',
    prerequisites: 'Gov Services Resident (18 taong gulang pataas), masigasig matuto ng beauty care.',
    materialsProvided: 'Nail grooming kit, salon cape, hair clips, sanitizer and manicure tools.',
  },
  {
    id: 'tr-computer',
    title: 'Basic Computer Training',
    category: 'Livelihood & Skills Development',
    description: 'Pagsasanay sa computer navigation, Microsoft Word document typing, Excel spreadsheet budgeting, internet search, email communication, at online job preparation.',
    date: 'September 28, 2026 - October 01, 2026',
    time: '1:00 PM - 4:00 PM (3 Hours/Day)',
    location: 'Gov Services Skills Development Center, Batasan Hills',
    landmark: '2nd Floor Computer Laboratory, Batasan Hills Center',
    totalSlots: 30,
    availableSlots: 30,
    durationHours: 12,
    dailyHours: 3,
    totalDays: 4,
    instructor: 'G. Mark Villanueva (IT Skills Coordinator)',
    prerequisites: 'Gov Services Resident na nais matuto ng computer mula sa basic navigation hanggang office tools.',
    materialsProvided: 'Computer workstation with internet, digital handouts, practice USB drive.',
  },
];

function generateReference(qcid) {
  if (qcid && String(qcid).trim()) return String(qcid).trim();
  return '110000116932100';
}

function loadPersistentApps() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading training applications from JSON:', err.message);
  }
  return [];
}

function savePersistentApps(apps) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(apps, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving training applications to JSON:', err.message);
  }
}

let memoryApplications = loadPersistentApps();

// Ensure DB table exists
async function initTrainingTable() {
  try {
    await db.query(`
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
    `);
  } catch (e) {
    console.warn('Note: training_applications DB table init check:', e.message);
  }
}
initTrainingTable();

// Format DB record to frontend structure
function mapDbRowToApp(row) {
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    qcid: row.qcid,
    userId: row.user_id,
    trainingId: row.training_id,
    trainingName: row.training_name,
    applicantInfo: typeof row.applicant_info === 'string' ? JSON.parse(row.applicant_info) : (row.applicant_info || {}),
    status: row.status || 'pending',
    submittedAt: row.submitted_at || row.created_at,
    approvedBy: row.approved_by,
    approvedDate: row.approved_date,
    rejectionReason: row.rejection_reason,
    revisionNotes: row.revision_notes,
    schedule: typeof row.schedule === 'string' ? JSON.parse(row.schedule) : (row.schedule || {}),
    attendance: typeof row.attendance === 'string' ? JSON.parse(row.attendance) : (row.attendance || {}),
    certificate: typeof row.certificate === 'string' ? JSON.parse(row.certificate) : (row.certificate || null),
  };
}

// GET /api/training/programs
exports.getAvailablePrograms = async (req, res) => {
  try {
    let allApps = [];
    try {
      const result = await db.query("SELECT * FROM training_applications WHERE status != 'rejected'");
      if (result && Array.isArray(result.rows) && result.rows.length > 0) {
        allApps = result.rows.map(mapDbRowToApp);
      } else {
        allApps = memoryApplications.filter((a) => a.status !== 'rejected');
      }
    } catch (_) {
      allApps = memoryApplications.filter((a) => a.status !== 'rejected');
    }

    const dynamicPrograms = DEFAULT_TRAINING_COURSES.map((course) => {
      const courseApps = allApps.filter(
        (a) =>
          a.trainingId === course.id ||
          a.trainingName?.toLowerCase() === course.title?.toLowerCase() ||
          a.schedule?.trainingName?.toLowerCase() === course.title?.toLowerCase()
      );
      const enrolledCount = courseApps.length;
      const totalSlots = course.totalSlots || 25;
      const availableSlots = Math.max(0, totalSlots - enrolledCount);
      const percentFilled = Math.min(100, Math.round((enrolledCount / totalSlots) * 100));

      return {
        ...course,
        enrolledCount,
        availableSlots,
        percentFilled,
      };
    });

    return res.status(200).json({
      success: true,
      programs: dynamicPrograms,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/training/applications
exports.getApplications = async (req, res) => {
  try {
    const { qcid, email } = req.query;

    // Try querying PostgreSQL
    try {
      let query = 'SELECT * FROM training_applications';
      const params = [];
      const conditions = [];

      if (qcid) {
        params.push(String(qcid).trim());
        conditions.push(`(qcid = $${params.length} OR user_id = $${params.length})`);
      } else if (email) {
        params.push(`%${String(email).trim().toLowerCase()}%`);
        conditions.push(`LOWER(applicant_info->>'email') LIKE $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY submitted_at DESC, id DESC';

      const result = await db.query(query, params);
      if (result && Array.isArray(result.rows) && result.rows.length > 0) {
        const apps = result.rows.map(mapDbRowToApp);
        return res.status(200).json({
          success: true,
          applications: apps,
        });
      }
    } catch (dbErr) {
      console.warn('DB query failed, using memory/file storage:', dbErr.message);
    }

    // Fallback to memory / file storage
    let list = [...memoryApplications];
    if (qcid) {
      const q = String(qcid).trim();
      list = list.filter((a) => a.qcid === q || a.userId === q);
    } else if (email) {
      const em = String(email).trim().toLowerCase();
      list = list.filter((a) => a.applicantInfo?.email?.toLowerCase() === em);
    }

    return res.status(200).json({
      success: true,
      applications: list,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/training/apply
exports.applyForTraining = async (req, res) => {
  try {
    const { trainingId, trainingName, applicantInfo, qcid } = req.body;

    if (!trainingId || !trainingName) {
      return res.status(400).json({ success: false, message: 'Please select a training program.' });
    }

    const matchedCourse = DEFAULT_TRAINING_COURSES.find((c) => c.id === trainingId) || {
      date: 'September 15, 2026 - September 18, 2026',
      time: '9:00 AM - 12:00 PM',
      location: 'Gov Services Skills Development Center, Batasan Hills',
      landmark: 'Near Batasan Hills Barangay Hall / across Puregold Batasan',
      durationHours: 12,
    };

    const userQcid = qcid || applicantInfo?.qcidNo || applicantInfo?.qcidNumber || '110000116932100';
    const refNum = generateReference(userQcid);

    const fullApplicantInfo = {
      fullName: applicantInfo?.fullName || `${applicantInfo?.firstName || ''} ${applicantInfo?.lastName || ''}`.trim(),
      firstName: applicantInfo?.firstName || '',
      middleName: applicantInfo?.middleName || '',
      lastName: applicantInfo?.lastName || '',
      suffix: applicantInfo?.suffix || '',
      email: applicantInfo?.email || '',
      contactNo: applicantInfo?.contactNo || applicantInfo?.mobileNumber || '',
      address: applicantInfo?.address || '',
      barangay: applicantInfo?.barangay || '',
      city: applicantInfo?.city || 'Quezon City',
      sex: applicantInfo?.sex || '',
      dateOfBirth: applicantInfo?.dateOfBirth || applicantInfo?.birthDate || '',
      age: applicantInfo?.age || '',
      occupation: applicantInfo?.occupation || '',
    };

    const scheduleData = {
      trainingName,
      trainingDate: matchedCourse.date,
      trainingTime: matchedCourse.time,
      trainingLocation: matchedCourse.location,
      landmark: matchedCourse.landmark,
      trainingStatus: 'Upcoming',
    };

    const attendanceData = {
      totalHours: matchedCourse.durationHours || 12,
      hoursCompleted: 0,
      completed: false,
      dailyHours: 3,
      totalDays: 4,
      sessions: [
        { day: 1, topic: 'Orientation & Fundamental Skills', hours: 3, attended: false, date: matchedCourse.date.split('-')[0]?.trim() || 'Day 1' },
        { day: 2, topic: 'Hands-on Application & Practical Work', hours: 3, attended: false, date: 'Day 2' },
        { day: 3, topic: 'Specialized Techniques & Daily Assessment', hours: 3, attended: false, date: 'Day 3' },
        { day: 4, topic: 'Final Output, Evaluation & Certificate Grant', hours: 3, attended: false, date: matchedCourse.date.split('-')[1]?.trim() || 'Day 4' },
      ],
    };

    let createdApp = null;

    // Save to PostgreSQL
    try {
      const insertQuery = `
        INSERT INTO training_applications (
          reference_number, qcid, user_id, training_id, training_name,
          applicant_info, status, schedule, attendance, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *
      `;
      const result = await db.query(insertQuery, [
        refNum,
        userQcid,
        userQcid,
        trainingId,
        trainingName,
        JSON.stringify(fullApplicantInfo),
        'pending',
        JSON.stringify(scheduleData),
        JSON.stringify(attendanceData),
      ]);

      if (result && result.rows.length > 0) {
        createdApp = mapDbRowToApp(result.rows[0]);
      }
    } catch (dbErr) {
      console.warn('PostgreSQL insert training application error:', dbErr.message);
    }

    if (!createdApp) {
      createdApp = {
        id: Date.now(),
        referenceNumber: refNum,
        qcid: userQcid,
        userId: userQcid,
        trainingId,
        trainingName,
        applicantInfo: fullApplicantInfo,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        schedule: scheduleData,
        attendance: attendanceData,
        certificate: null,
      };
    }

    // Keep memory / JSON file synced
    memoryApplications.unshift(createdApp);
    savePersistentApps(memoryApplications);

    // Activity Log
    if (logActivity) {
      try {
        logActivity({
          actor: fullApplicantInfo.fullName || 'Citizen User',
          actor_role: 'User',
          action: 'TRAINING_APPLICATION_SUBMITTED',
          module: 'Livelihood & Training',
          reference_no: refNum,
          subject: trainingName,
          detail: `Submitted new application for ${trainingName} (${refNum}).`,
        });
      } catch (_) {}
    }

    return res.status(201).json({
      success: true,
      message: 'Application for training submitted successfully.',
      application: createdApp,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/training/applications/:id/status
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, revisionNotes, attendance, trainingStatus, approvedBy } = req.body;

    let updatedApp = null;

    // 1. Try DB Update
    try {
      const getRes = await db.query(
        'SELECT * FROM training_applications WHERE id::text = $1 OR reference_number = $1',
        [String(id)]
      );

      if (getRes && getRes.rows.length > 0) {
        const row = getRes.rows[0];
        let newStatus = status || row.status;
        let newApprovedBy = row.approved_by;
        let newApprovedDate = row.approved_date;
        let newRejectionReason = rejectionReason !== undefined ? rejectionReason : row.rejection_reason;
        let newRevisionNotes = revisionNotes !== undefined ? revisionNotes : row.revision_notes;
        let newSchedule = typeof row.schedule === 'string' ? JSON.parse(row.schedule) : (row.schedule || {});
        let newAttendance = typeof row.attendance === 'string' ? JSON.parse(row.attendance) : (row.attendance || {});
        let newCertificate = typeof row.certificate === 'string' ? JSON.parse(row.certificate) : (row.certificate || null);

        if (status === 'approved') {
          newApprovedBy = approvedBy || 'Gov Services Skills Development Division';
          newApprovedDate = new Date().toISOString();
          newRejectionReason = null;
          newRevisionNotes = null;
        }

        if (trainingStatus && newSchedule) {
          newSchedule.trainingStatus = trainingStatus;
        }

        if (attendance) {
          newAttendance = { ...newAttendance, ...attendance };
          const attendedCount = (newAttendance.sessions || []).filter((s) => s.attended).length;
          newAttendance.hoursCompleted = attendedCount * (newAttendance.dailyHours || 3);
          const isFullyAttended = (newAttendance.sessions || []).length > 0 && attendedCount === (newAttendance.sessions || []).length;

          if (isFullyAttended || newAttendance.hoursCompleted >= (newAttendance.totalHours || 12) || newAttendance.completed) {
            newAttendance.completed = true;
            newAttendance.hoursCompleted = newAttendance.totalHours || 12;
            if (newSchedule) newSchedule.trainingStatus = 'Completed';

            if (!newCertificate) {
              newCertificate = {
                certificateNo: `GOV-CERT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
                issueDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                title: `Certificate of Completion in ${row.training_name}`,
                recipientName: row.applicant_info?.fullName || 'Resident Beneficiary',
                trainingName: row.training_name,
                hoursCompleted: newAttendance.totalHours || 12,
                status: 'Issued',
              };
            }
          } else {
            newAttendance.completed = false;
            if (newSchedule && newSchedule.trainingStatus === 'Completed') {
              newSchedule.trainingStatus = attendedCount > 0 ? 'Ongoing' : 'Upcoming';
            }
          }
        }

        const updateRes = await db.query(
          `UPDATE training_applications 
           SET status = $1, approved_by = $2, approved_date = $3, rejection_reason = $4,
               revision_notes = $5, schedule = $6, attendance = $7, certificate = $8, updated_at = NOW()
           WHERE id = $9 RETURNING *`,
          [
            newStatus,
            newApprovedBy,
            newApprovedDate,
            newRejectionReason,
            newRevisionNotes,
            JSON.stringify(newSchedule),
            JSON.stringify(newAttendance),
            newCertificate ? JSON.stringify(newCertificate) : null,
            row.id,
          ]
        );

        if (updateRes && updateRes.rows.length > 0) {
          updatedApp = mapDbRowToApp(updateRes.rows[0]);
        }
      }
    } catch (dbErr) {
      console.warn('PostgreSQL update training application error:', dbErr.message);
    }

    // 2. Fallback memory / JSON update
    const idx = memoryApplications.findIndex((a) => String(a.id) === String(id) || a.referenceNumber === String(id));
    if (idx !== -1) {
      const app = memoryApplications[idx];
      if (status) {
        app.status = status;
        if (status === 'approved') {
          app.approvedBy = approvedBy || 'Gov Services Skills Development Division';
          app.approvedDate = new Date().toISOString();
          app.rejectionReason = undefined;
          app.revisionNotes = undefined;
        } else if (status === 'rejected') {
          app.rejectionReason = rejectionReason || 'Requirements incomplete or slot unavailable.';
        } else if (status === 'needs_revision') {
          app.revisionNotes = revisionNotes || 'Please verify or update your contact details or required information.';
        }
      }
      if (trainingStatus && app.schedule) {
        app.schedule.trainingStatus = trainingStatus;
      }
      if (attendance) {
        app.attendance = { ...app.attendance, ...attendance };
        if (app.attendance.hoursCompleted >= app.attendance.totalHours || app.attendance.completed) {
          app.attendance.completed = true;
          if (app.schedule) app.schedule.trainingStatus = 'Completed';
          if (!app.certificate) {
            app.certificate = {
              certificateNo: `GOV-CERT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
              issueDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
              title: `Certificate of Completion in ${app.trainingName}`,
              recipientName: app.applicantInfo?.fullName || 'Resident Beneficiary',
              trainingName: app.trainingName,
              hoursCompleted: app.attendance.totalHours || 16,
              status: 'Issued',
            };
          }
        }
      }
      memoryApplications[idx] = app;
      savePersistentApps(memoryApplications);
      if (!updatedApp) updatedApp = app;
    }

    if (!updatedApp) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Direct Notification Entry for User Portal
    if (status === 'approved' || status === 'rejected' || status === 'needs_revision') {
      try {
        const notifTitle = status === 'approved'
          ? 'Gov Services Training: Approved'
          : status === 'needs_revision'
          ? 'Gov Services Training: Needs Revision'
          : 'Gov Services Training: Not Approved';
        const notifDesc = `${updatedApp.trainingName || 'Skills Training'} — ${status === 'approved' ? 'Aprubado ang inyong aplikasyon sa training.' : status === 'rejected' ? (rejectionReason || updatedApp.rejectionReason || 'Hindi naaprubahan ang inyong aplikasyon.') : (revisionNotes || updatedApp.revisionNotes || 'Nangangailangan ng karagdagang impormasyon.')} (Ref: ${updatedApp.referenceNumber || updatedApp.qcid})`;

        await db.query(
          `INSERT INTO user_notifications (user_id, title, description, application_ref)
           VALUES ($1, $2, $3, $4)`,
          [updatedApp.qcid || updatedApp.userId || '110000116932100', notifTitle, notifDesc, updatedApp.referenceNumber || updatedApp.qcid]
        ).catch(() => {});
      } catch (_) {}
    }

    // Activity Log
    if (logActivity) {
      try {
        logActivity({
          actor: approvedBy || 'Admin Staff',
          actor_role: 'Admin',
          action: `TRAINING_APPLICATION_${String(status || 'UPDATED').toUpperCase()}`,
          module: 'Livelihood & Training',
          reference_no: updatedApp.referenceNumber,
          subject: updatedApp.trainingName,
          detail: `Training application status updated to ${updatedApp.status} for ${updatedApp.referenceNumber}.`,
        });
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      message: 'Application updated successfully.',
      application: updatedApp,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/training/applications/:id
exports.deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    // DB delete
    try {
      await db.query(
        'DELETE FROM training_applications WHERE id::text = $1 OR reference_number = $1',
        [String(id)]
      );
    } catch (e) {
      console.warn('DB delete error:', e.message);
    }

    // Memory delete
    memoryApplications = memoryApplications.filter(
      (a) => String(a.id) !== String(id) && a.referenceNumber !== String(id)
    );
    savePersistentApps(memoryApplications);

    return res.status(200).json({ success: true, message: 'Training application deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/training/reset
exports.resetApplications = async (req, res) => {
  try {
    try {
      await db.query('DELETE FROM training_applications');
    } catch (_) {}
    memoryApplications = [];
    savePersistentApps(memoryApplications);
    return res.status(200).json({ success: true, message: 'Training applications reset.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
