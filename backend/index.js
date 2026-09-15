const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
require('dotenv').config();

const db = require('./config/db');
const initDb = require('./config/initDb');

const aicsRoutes = require('./routes/aics');
const activityLogRoutes = require('./routes/activityLog');
const soloParentRoutes = require('./routes/soloParentRoutes');
const childWelfareRoutes = require('./routes/childWelfareRoutes');
const financialAidRoutes = require('./routes/financialAid');
const appointmentRoutes = require('./routes/appointments');
const notificationRoutes = require('./routes/notifications');
const livelihoodRoutes = require('./routes/livelihood');
const emailRoutes = require('./routes/email');
const pwdSeniorRoutes = require('./routes/pwdSeniorRoutes');
const authRoutes = require('./routes/authRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const userApplicationRoutes = require('./routes/userApplicationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const caseManagementRoutes = require('./routes/caseManagementRoutes');
const beneficiaryRoutes = require('./routes/beneficiaryRoutes');
const { autoReleaseScheduledDisbursements } = require('./controllers/financialAidController');

const app = express();

// Configure CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL.replace(/\/+$/, ''), 'http://localhost:5173', 'http://localhost:3000']
  : '*';

app.use(cors({
  origin: allowedOrigins === '*' ? '*' : (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const soloParentDir = path.join(uploadsDir, 'solo-parent');
const childWelfareDir = path.join(uploadsDir, 'child-welfare');
const aicsDir = path.join(uploadsDir, 'aics');
const livelihoodDir = path.join(uploadsDir, 'livelihood');
const pwdSeniorDir = path.join(uploadsDir, 'pwd-senior');

[uploadsDir, soloParentDir, childWelfareDir, aicsDir, livelihoodDir, pwdSeniorDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve static uploads uniformly
app.use('/uploads', express.static(uploadsDir));

// Fallback search in upload subdirectories (solo-parent, child-welfare, aics, livelihood, etc.)
app.use('/uploads', (req, res, next) => {
  try {
    const rawPath = decodeURIComponent(req.path || '').replace(/^\/+/, '');
    const filename = path.basename(rawPath);
    if (!filename) return next();

    // Check root uploads directory
    const rootCandidate = path.join(uploadsDir, filename);
    if (fs.existsSync(rootCandidate)) {
      return res.sendFile(rootCandidate);
    }

    // Check known subdirectories
    const subdirs = ['solo-parent', 'child-welfare', 'aics', 'livelihood', 'pwd', 'senior', 'pwd-senior', 'users', 'general'];
    for (const sub of subdirs) {
      const subCandidate = path.join(uploadsDir, sub, filename);
      if (fs.existsSync(subCandidate)) {
        return res.sendFile(subCandidate);
      }
      const nestedCandidate = path.join(uploadsDir, sub, rawPath);
      if (fs.existsSync(nestedCandidate)) {
        return res.sendFile(nestedCandidate);
      }

      // Check prefix / pattern match in subfolder (e.g. originalName vs multer name)
      const subDir = path.join(uploadsDir, sub);
      if (fs.existsSync(subDir)) {
        try {
          const ext = path.extname(filename);
          const baseClean = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
          if (baseClean && baseClean.length > 3) {
            const files = fs.readdirSync(subDir);
            const matchedFile = files.find((f) => {
              const fLower = f.toLowerCase();
              const bLower = baseClean.toLowerCase();
              return fLower.startsWith(bLower) || fLower.includes(bLower);
            });
            if (matchedFile) {
              return res.sendFile(path.join(subDir, matchedFile));
            }
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Upload fallback search error:', err);
  }
  next();
});

// Health check endpoints
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Database connected!', time: result.rows[0].now });
  } catch (err) {
    console.error('Database connection test failed:', err);
    res.status(500).json({ error: 'Database Error', details: err.message });
  }
});

// Disable HTTP caching for dynamic API routes to prevent mobile browser stale caching
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// API Routes
app.use('/api/aics', aicsRoutes);
app.use('/api/activity-log', activityLogRoutes);
app.use('/api/solo-parent', soloParentRoutes);
app.use('/solo-parent', soloParentRoutes);
app.use('/api/child-welfare', childWelfareRoutes);
app.use('/child-welfare', childWelfareRoutes);
app.use('/api/financial-aid', financialAidRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/livelihood', livelihoodRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/pwd-senior', pwdSeniorRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/user-applications', userApplicationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/case-management', caseManagementRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);

// Global user cleanup endpoint for test data & history deletion
app.delete('/api/cleanup-user/:nameOrRef', async (req, res) => {
  try {
    const { nameOrRef } = req.params;
    const term = `%${nameOrRef}%`;
    const summary = {};

    // 1. AICS
    try {
      const aicsApps = await db.query(
        `SELECT id FROM aics_applications 
         WHERE LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
            OR LOWER(first_name || ' ' || middle_name || ' ' || last_name) LIKE LOWER($1)
            OR reference_no LIKE $1 OR qc_id LIKE $1`,
        [term]
      );
      if (aicsApps.rows.length > 0) {
        const ids = aicsApps.rows.map((r) => r.id);
        await db.query(`DELETE FROM aics_documents WHERE application_id = ANY($1::int[])`, [ids]).catch(() => {});
        const del = await db.query(`DELETE FROM aics_applications WHERE id = ANY($1::int[])`, [ids]);
        summary.aics = del.rowCount;
      } else {
        summary.aics = 0;
      }
    } catch (e) { summary.aics_error = e.message; }

    // 2. Financial Aid Disbursements
    try {
      const del = await db.query(
        `DELETE FROM financial_aid_disbursements 
         WHERE applicant_name ILIKE $1 OR application_ref ILIKE $1`,
        [term]
      );
      summary.financial_aid = del.rowCount;
    } catch (e) { summary.financial_aid_error = e.message; }

    // 3. Appointments
    try {
      const del = await db.query(
        `DELETE FROM appointments 
         WHERE applicant_name ILIKE $1 OR reference_no ILIKE $1`,
        [term]
      );
      summary.appointments = del.rowCount;
    } catch (e) { summary.appointments_error = e.message; }

    // 4. PWD & Senior
    try {
      const del = await db.query(
        `DELETE FROM pwd_senior_applications 
         WHERE LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
            OR LOWER(first_name || ' ' || middle_name || ' ' || last_name) LIKE LOWER($1)
            OR reference_number LIKE $1`,
        [term]
      );
      summary.pwd_senior = del.rowCount;
    } catch (e) { summary.pwd_senior_error = e.message; }

    // 5. Solo Parent
    try {
      const del = await db.query(
        `DELETE FROM solo_parent_child_welfare_applications 
         WHERE LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
            OR LOWER(guardian_first_name || ' ' || guardian_last_name) LIKE LOWER($1)
            OR user_id::text LIKE $1 OR reference_number LIKE $1 OR qcid_number LIKE $1 OR child_name ILIKE $1`,
        [term]
      );
      summary.solo_parent_child_welfare = del.rowCount;
    } catch (e) { summary.solo_parent_error = e.message; }

    // 7. Livelihood
    try {
      const lhApps = await db.query(
        `SELECT id FROM livelihood_applications 
         WHERE LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
            OR user_id::text LIKE $1 OR reference_number LIKE $1 OR qcid LIKE $1`,
        [term]
      );
      if (lhApps.rows.length > 0) {
        const ids = lhApps.rows.map((r) => r.id);
        await db.query(`DELETE FROM livelihood_monitoring WHERE application_id = ANY($1::int[])`, [ids]).catch(() => {});
        await db.query(`DELETE FROM livelihood_assistance WHERE application_id = ANY($1::int[])`, [ids]).catch(() => {});
        const del = await db.query(`DELETE FROM livelihood_applications WHERE id = ANY($1::int[])`, [ids]);
        summary.livelihood = del.rowCount;
      } else {
        summary.livelihood = 0;
      }
    } catch (e) { summary.livelihood_error = e.message; }

    // 8. Notifications
    try {
      const del = await db.query(
        `DELETE FROM user_notifications 
         WHERE user_id LIKE $1 OR application_ref LIKE $1`,
        [term]
      );
      summary.notifications = del.rowCount;
    } catch (e) { summary.notifications_error = e.message; }

    // 9. Activity Log
    try {
      const del = await db.query(
        `DELETE FROM activity_log 
         WHERE actor ILIKE $1 OR reference_no LIKE $1 OR subject ILIKE $1`,
        [term]
      );
      summary.activity_log = del.rowCount;
    } catch (e) { summary.activity_log_error = e.message; }

    res.json({ success: true, message: `Cleanup completed for ${nameOrRef}`, summary });
  } catch (err) {
    console.error('Error during cleanup:', err);
    res.status(500).json({ error: 'Cleanup failed', details: err.message });
  }
});

// Optional: Serve frontend static build if running fullstack single-service mode
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Backend server running on http://0.0.0.0:${PORT}`);
  // Run schema migration / table check on startup
  await initDb();

  // Run auto-release worker every 30 seconds with re-entrancy protection
  let isReleasing = false;
  setInterval(async () => {
    if (isReleasing) return;
    try {
      isReleasing = true;
      await autoReleaseScheduledDisbursements();
    } catch (err) {
      console.warn('Disbursement worker warning:', err.message);
    } finally {
      isReleasing = false;
    }
  }, 30000);
});