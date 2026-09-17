const db = require('../config/db');
const { sendOtpEmail, sendPasswordResetEmail } = require('../services/emailService');
const { checkLoginLockout, recordFailedLogin, clearFailedLogins } = require('../middleware/rateLimiter');
const { generateToken, verifyToken } = require('../config/jwt');
const bcrypt = require('bcryptjs');

// In-memory fallback stores
let memoryOtps = new Map(); // email -> { otpCode, expiresAt, isUsed }
let memoryUsers = [];
let memorySessions = [];

/**
 * Hashes a plaintext password using bcrypt (salt rounds = 12)
 */
async function hashPassword(password) {
  if (!password) return '';
  return await bcrypt.hash(password, 12);
}

/**
 * Validates a plaintext password against a hashed (or legacy plaintext) password.
 */
async function verifyPassword(plainPassword, storedPassword) {
  if (!plainPassword || !storedPassword) return false;
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
    return await bcrypt.compare(plainPassword, storedPassword);
  }
  return plainPassword === storedPassword;
}

/**
 * Generates a standard 15-digit Quezon City Resident ID (QCID)
 */
function generateQcidNumber() {
  const prefix = '110000';
  const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${prefix}${randomPart}`;
}

/**
 * Generates a unique active session token for single device login control
 */
function generateSessionToken() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 12);
}

/**
 * Parses User-Agent header to identify device type, OS, and Browser
 */
function parseDeviceInfo(req) {
  const ua = req ? (req.headers['user-agent'] || '') : '';
  let deviceType = 'PC';
  let os = 'Windows';
  let browser = 'Google Chrome';

  const lowerUa = ua.toLowerCase();

  const isWindows = /windows|win32|win64/i.test(lowerUa);
  const isMac = /macintosh|mac os/i.test(lowerUa);
  const isIos = /iphone|ipad|ipod/i.test(lowerUa);
  const isAndroid = /android/i.test(lowerUa);
  const isLinux = /linux/i.test(lowerUa) && !isAndroid;

  if (isWindows) {
    os = 'Windows';
    deviceType = 'PC';
  } else if (isIos) {
    if (/ipad/i.test(lowerUa)) {
      os = 'iPadOS';
      deviceType = 'Tablet';
    } else {
      os = 'iOS';
      deviceType = 'CP (Cellphone)';
    }
  } else if (isAndroid) {
    os = 'Android';
    if (/tablet/i.test(lowerUa)) {
      deviceType = 'Tablet';
    } else {
      deviceType = 'CP (Cellphone)';
    }
  } else if (isMac) {
    os = 'macOS';
    deviceType = 'PC';
  } else if (isLinux) {
    os = 'Linux';
    deviceType = 'PC';
  }

  // Browser detection
  if (/edg/i.test(lowerUa)) {
    browser = 'Microsoft Edge';
  } else if (/opr|opera/i.test(lowerUa)) {
    browser = 'Opera';
  } else if (/firefox|fxios/i.test(lowerUa)) {
    browser = 'Mozilla Firefox';
  } else if (/chrome|crios/i.test(lowerUa)) {
    browser = 'Google Chrome';
  } else if (/safari/i.test(lowerUa)) {
    browser = 'Apple Safari';
  }

  let deviceName = '';
  if (deviceType === 'CP (Cellphone)') {
    deviceName = `${os === 'Android' ? 'Android CP' : os === 'iOS' ? 'iPhone (CP)' : `${os} CP`} • ${browser}`;
  } else if (deviceType === 'Tablet') {
    deviceName = `${os} Tablet • ${browser}`;
  } else {
    deviceName = `${os} PC • ${browser}`;
  }

  // IP resolution
  const forwarded = req?.headers ? req.headers['x-forwarded-for'] : null;
  let ip = (forwarded ? forwarded.split(',')[0].trim() : req?.socket?.remoteAddress || '127.0.0.1');
  if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';

  return {
    deviceType,
    deviceName,
    browser,
    os,
    ipAddress: ip,
    location: 'Quezon City, PH',
  };
}

async function recordNewSession(userId, email, sessionToken, req) {
  const parsed = parseDeviceInfo(req);
  const clientInfo = req?.body?.clientDeviceInfo || {};

  let os = parsed.os;
  let deviceType = parsed.deviceType;
  let deviceName = parsed.deviceName;
  let browser = clientInfo.browser || parsed.browser;

  if (clientInfo.deviceName) {
    deviceName = clientInfo.deviceName;
    deviceType = clientInfo.deviceType || (clientInfo.deviceName.includes('CP') ? 'CP (Cellphone)' : parsed.deviceType);
    os = clientInfo.os || parsed.os;
    browser = clientInfo.browser || parsed.browser;
  } else if (parsed.os === 'Android' || parsed.deviceType === 'CP (Cellphone)') {
    deviceType = 'CP (Cellphone)';
    os = 'Android';
    deviceName = `Android CP • ${browser}`;
  } else if (parsed.os === 'iOS') {
    deviceType = 'CP (Cellphone)';
    os = 'iOS';
    deviceName = `iPhone (CP) • ${browser}`;
  } else if (parsed.os === 'Windows') {
    os = 'Windows';
    deviceType = 'PC';
    deviceName = `Windows PC • ${browser}`;
  }

  const devInfo = {
    deviceType,
    deviceName,
    browser,
    os,
    ipAddress: parsed.ipAddress,
    location: parsed.location || 'Quezon City, PH',
  };
  const cleanEmail = String(email).toLowerCase();
  try {
    // 1. Mark previous active sessions for this user as terminated
    await db.query(
      `UPDATE user_login_sessions 
       SET is_active = false, logout_at = NOW(), logout_reason = $1 
       WHERE LOWER(email) = $2 AND is_active = true`,
      [`Overtaken by new login from ${devInfo.deviceName}`, cleanEmail]
    );

    // 2. Insert new session record
    await db.query(
      `INSERT INTO user_login_sessions 
       (user_id, email, session_token, device_type, device_name, browser, os, ip_address, location, is_active, login_at, last_active_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())`,
      [userId || null, cleanEmail, sessionToken, devInfo.deviceType, devInfo.deviceName, devInfo.browser, devInfo.os, devInfo.ipAddress, devInfo.location]
    );
  } catch (err) {
    console.warn('[DB Error] Recording login session to DB failed, updating memorySessions fallback:', err.message);
  }

  // Memory store fallback
  memorySessions.forEach((s) => {
    if (s.email.toLowerCase() === cleanEmail && s.isActive) {
      s.isActive = false;
      s.logoutAt = new Date().toISOString();
      s.logoutReason = `Overtaken by new login from ${devInfo.deviceName}`;
    }
  });

  memorySessions.unshift({
    id: Date.now(),
    userId: userId || null,
    email: cleanEmail,
    sessionToken,
    deviceType: devInfo.deviceType,
    deviceName: devInfo.deviceName,
    browser: devInfo.browser,
    os: devInfo.os,
    ipAddress: devInfo.ipAddress,
    location: devInfo.location,
    isActive: true,
    loginAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    logoutAt: null,
    logoutReason: null,
  });
}

/**
 * POST /api/auth/send-otp
 * Generates and emails a 6-digit OTP code to the applicant's Gmail address
 */
exports.sendOtp = async (req, res) => {
  try {
    const { email, recipientName } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Valid email address is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    if (!emailRegex.test(cleanEmail) || cleanEmail.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format. Please provide a valid active email address.',
      });
    }

    if (cleanEmail.endsWith('@gmail.com')) {
      const username = cleanEmail.split('@')[0];
      if (username.length < 6 || username.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Gmail address. Gmail usernames must be between 6 and 30 characters.',
        });
      }
      if (!/^[a-z0-9.]+$/.test(username) || username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Gmail address format.',
        });
      }
    }

    // Check if email is already registered in Database or memory store
    try {
      const existingUserRes = await db.query('SELECT id, email, status FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (existingUserRes.rows.length > 0) {
        return res.status(409).json({
          success: false,
          isAlreadyRegistered: true,
          message: 'This email is already registered. Please log in or use Forgot Password to access your account.',
        });
      }
    } catch (dbErr) {
      console.warn('[DB Error] Email existence check failed, checking memory:', dbErr.message);
    }

    const memUser = memoryUsers.find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (memUser) {
      return res.status(409).json({
        success: false,
        isAlreadyRegistered: true,
        message: 'This email is already registered. Please log in or use Forgot Password to access your account.',
      });
    }

    // Generate random 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save to Database
    try {
      await db.query(
        `INSERT INTO email_otps (email, otp_code, expires_at, is_used, created_at)
         VALUES ($1, $2, $3, false, NOW())`,
        [cleanEmail, otpCode, expiresAt]
      );
    } catch (dbErr) {
      console.warn('[DB Error] Saving OTP to DB failed, using memory store:', dbErr.message);
    }

    // Always keep in memory store as fallback
    memoryOtps.set(cleanEmail, {
      otpCode,
      expiresAt: expiresAt.getTime(),
      isUsed: false,
    });

    console.log(`[OTP] Generated OTP ${otpCode} for ${cleanEmail}. Dispatching email in background...`);

    // Dispatch official email asynchronously in background so client response is instant
    sendOtpEmail({
      recipientEmail: cleanEmail,
      otpCode,
      recipientName: recipientName || 'Resident',
    }).then((emailResult) => {
      console.log(`[OTP Background Dispatch] Result for ${cleanEmail}:`, emailResult);
    }).catch((err) => {
      console.error(`[OTP Background Dispatch Error] Failed for ${cleanEmail}:`, err.message);
    });

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
    });
  } catch (err) {
    console.error('Error in sendOtp controller:', err);
    return res.status(500).json({ success: false, message: 'Server error while sending OTP', error: err.message });
  }
};

/**
 * POST /api/auth/verify-otp
 * Verifies the 6-digit OTP code
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    // 1. Check in DB
    try {
      const dbRes = await db.query(
        `SELECT * FROM email_otps 
         WHERE email = $1 AND otp_code = $2 AND is_used = false AND expires_at > NOW()
         ORDER BY id DESC LIMIT 1`,
        [cleanEmail, cleanOtp]
      );

      if (dbRes.rows.length > 0) {
        const otpRecord = dbRes.rows[0];
        // Mark as used
        await db.query(`UPDATE email_otps SET is_used = true WHERE id = $1`, [otpRecord.id]);
        memoryOtps.delete(cleanEmail);
        return res.status(200).json({
          success: true,
          message: 'OTP verified successfully.',
        });
      }
    } catch (dbErr) {
      console.warn('[DB Error] Verifying OTP in DB failed, checking memory store:', dbErr.message);
    }

    // 2. Fallback check memory store
    const memRecord = memoryOtps.get(cleanEmail);
    if (memRecord) {
      const now = Date.now();
      if (!memRecord.isUsed && memRecord.otpCode === cleanOtp && memRecord.expiresAt > now) {
        memRecord.isUsed = true;
        memoryOtps.delete(cleanEmail);
        return res.status(200).json({
          success: true,
          message: 'OTP verified successfully.',
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid or expired OTP code. Please request a new code.',
    });
  } catch (err) {
    console.error('Error in verifyOtp controller:', err);
    return res.status(500).json({ success: false, message: 'Server error while verifying OTP', error: err.message });
  }
};

/**
 * POST /api/auth/register
 * Creates and registers a new resident user account in the database
 */
exports.register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      middleName,
      suffix,
      birthMonth,
      birthDay,
      birthYear,
      birthDate,
      city,
      specifyCity,
      houseNo,
      street,
      barangay,
      workingInQC,
      occupation,
      sex,
      bloodType,
      mobileNumber,
      profilePhotoUrl,
    } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const finalCity = city === 'Others' && specifyCity ? specifyCity.trim() : (city || 'Quezon City').trim();
    const finalBirthDate = birthDate || (birthMonth && birthDay && birthYear ? `${birthMonth} ${birthDay}, ${birthYear}` : '');
    const qcidNumber = generateQcidNumber();

    const rawPassword = password || 'default123';
    const hashedPassword = await hashPassword(rawPassword);

    const newUser = {
      email: cleanEmail,
      password: hashedPassword,
      firstName: (firstName || '').trim().toUpperCase(),
      lastName: (lastName || '').trim().toUpperCase(),
      middleName: (middleName || '').trim().toUpperCase(),
      suffix: (suffix || '').trim().toUpperCase(),
      birthDate: finalBirthDate,
      birthMonth: birthMonth || '',
      birthDay: birthDay || '',
      birthYear: birthYear || '',
      city: finalCity,
      barangay: (barangay || '').trim(),
      street: (street || '').trim(),
      houseNo: (houseNo || '').trim(),
      workingInQC: workingInQC || 'No',
      occupation: (occupation || '').trim(),
      sex: sex || 'FEMALE',
      bloodType: (bloodType || '').trim(),
      mobileNumber: (mobileNumber || '').trim(),
      profilePhotoUrl: profilePhotoUrl || null,
      qcidNumber: qcidNumber,
      role: 'user',
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const existingUser = await db.query('SELECT id, email FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          isAlreadyRegistered: true,
          message: 'An account with this email address already exists. Please sign in instead.',
        });
      }

      // Insert new user
      const insertRes = await db.query(
        `INSERT INTO users (
          email, password, first_name, last_name, middle_name, suffix,
          birth_date, birth_month, birth_day, birth_year,
          city, barangay, street, house_no,
          working_in_qc, occupation, sex, blood_type, mobile_number, profile_photo_url,
          qcid_number, role, is_email_verified, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
        ) RETURNING id`,
        [
          newUser.email, newUser.password, newUser.firstName, newUser.lastName, newUser.middleName, newUser.suffix,
          newUser.birthDate, newUser.birthMonth, newUser.birthDay, newUser.birthYear,
          newUser.city, newUser.barangay, newUser.street, newUser.houseNo,
          newUser.workingInQC, newUser.occupation, newUser.sex, newUser.bloodType, newUser.mobileNumber,
          newUser.profilePhotoUrl, newUser.qcidNumber, newUser.role, newUser.isEmailVerified
        ]
      );
      if (insertRes.rows.length > 0) {
        newUser.id = insertRes.rows[0].id;
      }
    } catch (dbErr) {
      console.warn('[DB Error] Saving user to DB failed, saving to memory fallback:', dbErr.message);
      if (memoryUsers.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
        return res.status(409).json({
          success: false,
          isAlreadyRegistered: true,
          message: 'An account with this email address already exists. Please sign in instead.',
        });
      }
      memoryUsers.push(newUser);
    }

    const safeUser = { ...newUser };
    delete safeUser.password;

    const token = generateToken({
      id: safeUser.id || 1,
      email: safeUser.email,
      role: safeUser.role || 'user',
      qcidNo: safeUser.qcidNumber,
    });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Error in register controller:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration', error: err.message });
  }
};

/**
 * POST /api/auth/login
 * Handles user and staff login with strict registered user validation
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 0. Check Progressive Rate Limiting & Lockout
    const lockout = await checkLoginLockout(req, cleanEmail);
    if (lockout.isLocked) {
      return res.status(429).json({
        success: false,
        isRateLimited: true,
        remainingSeconds: lockout.remainingSeconds,
        message: lockout.message,
      });
    }

    // Helper for login failure response with tiered attempt counter
    const handleLoginFailure = async (userEmail, customMsg) => {
      const record = await recordFailedLogin(req, userEmail);
      if (record.count >= 6) {
        return res.status(429).json({
          success: false,
          isRateLimited: true,
          remainingSeconds: 900,
          message: 'Too many failed login attempts. Your account is locked for 15 minutes for security.',
        });
      } else if (record.count === 5) {
        return res.status(429).json({
          success: false,
          isRateLimited: true,
          remainingSeconds: 300,
          message: 'Too many failed login attempts (5/5). Your login is locked for 5 minutes for security.',
        });
      } else if (record.count === 3) {
        return res.status(429).json({
          success: false,
          isRateLimited: true,
          remainingSeconds: 60,
          message: 'Too many failed login attempts (3/3). Your login is locked for 1 minute for security.',
        });
      }

      const baseMsg = customMsg || 'Incorrect password. Please verify your password and try again.';
      const tierMax = record.count >= 4 ? 5 : 3;
      return res.status(401).json({
        success: false,
        message: `${baseMsg} (${record.count}/${tierMax} failed attempts)`,
      });
    };

    // 1. Query PostgreSQL Database for registered user (Strict 100% DB Verification)
    try {
      const userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (userRes.rows.length > 0) {
        const dbUser = userRes.rows[0];

        // Check password using bcrypt
        const isPasswordValid = await verifyPassword(cleanPassword, dbUser.password);
        if (!isPasswordValid) {
          return await handleLoginFailure(cleanEmail);
        }

        // Check account active/inactive status
        const userStatus = String(dbUser.status || 'active').toLowerCase();
        if (userStatus === 'inactive' || userStatus === 'deactivated') {
          return res.status(403).json({
            success: false,
            isInactive: true,
            email: dbUser.email,
            name: `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() || 'Resident',
            message: 'Your account is currently deactivated. Would you like to reactivate it?',
          });
        }

        // Generate unique single active session token
        const sessionToken = generateSessionToken();

        // 1. Persist active session token in DB synchronously before returning
        try {
          await db.query('UPDATE users SET last_login = NOW(), active_session_token = $1 WHERE id = $2', [sessionToken, dbUser.id]);
          await recordNewSession(dbUser.id, dbUser.email, sessionToken, req);
        } catch (sessErr) {
          console.warn('[Session Init Warning]:', sessErr.message);
        }

        // 2. Background cleanup of failed logins & legacy password upgrade
        clearFailedLogins(req, cleanEmail).catch(() => {});
        if (dbUser.password && !dbUser.password.startsWith('$2')) {
          hashPassword(cleanPassword).then((upgradedHash) => {
            db.query('UPDATE users SET password = $1 WHERE id = $2', [upgradedHash, dbUser.id]).catch(() => {});
          }).catch(() => {});
        }

        const userPayload = {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.first_name || '',
          lastName: dbUser.last_name || '',
          middleName: dbUser.middle_name || '',
          suffix: dbUser.suffix || '',
          birthDate: dbUser.birth_date || '',
          birthMonth: dbUser.birth_month || '',
          birthDay: dbUser.birth_day || '',
          birthYear: dbUser.birth_year || '',
          city: dbUser.city || 'QUEZON CITY',
          barangay: dbUser.barangay || '',
          street: dbUser.street || '',
          houseNo: dbUser.house_no || '',
          workingInQC: dbUser.working_in_qc || 'No',
          occupation: dbUser.occupation || '',
          sex: dbUser.sex || 'FEMALE',
          bloodType: dbUser.blood_type || '',
          mobileNumber: dbUser.mobile_number || '',
          profilePhotoUrl: dbUser.profile_photo_url || null,
          qcidNumber: dbUser.qcid_number || '110000116932100',
          role: dbUser.role || 'user',
          status: dbUser.status || 'active',
          lastLogin: new Date().toISOString(),
        };

        // Generate signed JSON Web Token (JWT) with 8-hour expiration
        const token = generateToken({
          id: userPayload.id,
          email: userPayload.email,
          role: userPayload.role,
          qcidNo: userPayload.qcidNumber,
          sessionToken: sessionToken,
        });

        return res.status(200).json({
          success: true,
          token,
          sessionToken,
          role: userPayload.role,
          user: userPayload,
        });
      }
    } catch (dbErr) {
      console.warn('[DB Error] Login DB lookup failed, checking memory fallback:', dbErr.message);
    }

    // 3. Check memory store fallback
    const memUser = memoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (memUser) {
      const isMemPasswordValid = await verifyPassword(cleanPassword, memUser.password);
      if (!isMemPasswordValid) {
        return await handleLoginFailure(cleanEmail);
      }

      const memStatus = String(memUser.status || 'active').toLowerCase();
      if (memStatus === 'inactive' || memStatus === 'deactivated') {
        return res.status(403).json({
          success: false,
          isInactive: true,
          email: memUser.email,
          name: `${memUser.firstName || ''} ${memUser.lastName || ''}`.trim() || 'Resident',
          message: 'Your account is currently deactivated. Would you like to reactivate it?',
        });
      }

      if (memUser.password && !memUser.password.startsWith('$2')) {
        memUser.password = await hashPassword(cleanPassword);
      }

      await clearFailedLogins(req, cleanEmail);

      const sessionToken = generateSessionToken();
      memUser.lastLogin = new Date().toISOString();
      memUser.activeSessionToken = sessionToken;

      await recordNewSession(memUser.id, memUser.email, sessionToken, req);

      const safeMemUser = { ...memUser };
      delete safeMemUser.password;

      // Generate signed JSON Web Token (JWT) for memory user
      const token = generateToken({
        id: safeMemUser.id || 1,
        email: safeMemUser.email,
        role: safeMemUser.role || 'user',
        qcidNo: safeMemUser.qcidNumber,
        sessionToken: sessionToken,
      });

      return res.status(200).json({
        success: true,
        token,
        sessionToken,
        role: safeMemUser.role || 'user',
        user: safeMemUser,
      });
    }

    // 4. User is NOT found in database or memory store -> Record failed attempt for random names
    return await handleLoginFailure(cleanEmail, 'Account not found or invalid credentials.');
  } catch (err) {
    console.error('Error in login controller:', err);
    return res.status(500).json({ success: false, message: 'Server error during login', error: err.message });
  }
};

/**
 * GET /api/auth/lockout-status
 * Checks if client IP / email is currently in lockout state
 */
exports.getLockoutStatus = async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    const lockout = await checkLoginLockout(req, email);
    return res.status(200).json({
      isLocked: Boolean(lockout.isLocked),
      remainingSeconds: lockout.remainingSeconds || 0,
      message: lockout.message || null,
    });
  } catch (err) {
    return res.status(200).json({ isLocked: false, remainingSeconds: 0 });
  }
};

/**
 * POST /api/auth/reactivate
 * Self-service account reactivation by resident user
 */
exports.reactivateAccount = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check in DB
    try {
      const userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (userRes.rows.length > 0) {
        const dbUser = userRes.rows[0];

        if (password) {
          const isPasswordValid = await verifyPassword(password, dbUser.password);
          if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Incorrect password. Reactivation cancelled.' });
          }
        }

        const sessionToken = generateSessionToken();
        await db.query(`UPDATE users SET status = 'active', last_login = NOW(), active_session_token = $1, updated_at = NOW() WHERE id = $2`, [sessionToken, dbUser.id]);

        await recordNewSession(dbUser.id, dbUser.email, sessionToken, req);

        const userPayload = {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.first_name || '',
          lastName: dbUser.last_name || '',
          middleName: dbUser.middle_name || '',
          suffix: dbUser.suffix || '',
          birthDate: dbUser.birth_date || '',
          birthMonth: dbUser.birth_month || '',
          birthDay: dbUser.birth_day || '',
          birthYear: dbUser.birth_year || '',
          city: dbUser.city || 'QUEZON CITY',
          barangay: dbUser.barangay || '',
          street: dbUser.street || '',
          houseNo: dbUser.house_no || '',
          workingInQC: dbUser.working_in_qc || 'No',
          occupation: dbUser.occupation || '',
          sex: dbUser.sex || 'FEMALE',
          mobileNumber: dbUser.mobile_number || '',
          profilePhotoUrl: dbUser.profile_photo_url || null,
          qcidNumber: dbUser.qcid_number || '110000116932100',
          role: dbUser.role || 'user',
          status: 'active',
          lastLogin: new Date().toISOString(),
        };

        return res.status(200).json({
          success: true,
          sessionToken,
          message: 'Account successfully reactivated! Welcome back to GovServe.',
          role: userPayload.role,
          user: userPayload,
        });
      }
    } catch (dbErr) {
      console.warn('[DB Error] Reactivate account failed:', dbErr.message);
    }

    // 2. Memory store fallback
    const memUser = memoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (memUser) {
      if (password) {
        const isMemPasswordValid = await verifyPassword(password, memUser.password);
        if (!isMemPasswordValid) {
          return res.status(401).json({ success: false, message: 'Incorrect password. Reactivation cancelled.' });
        }
      }
      const sessionToken = generateSessionToken();
      memUser.status = 'active';
      memUser.lastLogin = new Date().toISOString();
      memUser.activeSessionToken = sessionToken;
      const safeUser = { ...memUser };
      delete safeUser.password;
      return res.status(200).json({
        success: true,
        sessionToken,
        message: 'Account successfully reactivated! Welcome back to GovServe.',
        role: safeUser.role || 'user',
        user: safeUser,
      });
    }

    return res.status(404).json({ success: false, message: 'User account not found.' });
  } catch (err) {
    console.error('Error in reactivateAccount controller:', err);
    return res.status(500).json({ success: false, message: 'Server error during account reactivation', error: err.message });
  }
};

/**
 * GET /api/auth/verify-session
 * Validates if the client's current session token matches the single active session in DB
 */
exports.verifySession = async (req, res) => {
  try {
    const email = (req.query.email || req.headers['x-user-email'] || '').trim().toLowerCase();
    const sessionToken = (req.query.token || req.headers['x-session-token'] || '').trim();

    if (!email || !sessionToken) {
      return res.status(200).json({ success: true, active: true });
    }

    // Check account status and active session in DB
    try {
      const userRes = await db.query('SELECT id, status, active_session_token FROM users WHERE LOWER(email) = $1', [email]);
      if (userRes.rows.length > 0) {
        const dbUser = userRes.rows[0];
        const status = String(dbUser.status || 'active').toLowerCase();
        if (status === 'inactive' || status === 'deactivated') {
          return res.status(200).json({
            success: false,
            isSessionTerminated: true,
            message: 'Your account has been deactivated.',
          });
        }

        // If the token matches the active session token in DB, it is active and valid
        if (dbUser.active_session_token === sessionToken) {
          return res.status(200).json({ success: true, active: true });
        }

        // If active_session_token is not set in DB, set it now
        if (!dbUser.active_session_token) {
          db.query('UPDATE users SET active_session_token = $1 WHERE id = $2', [sessionToken, dbUser.id]).catch(() => {});
          return res.status(200).json({ success: true, active: true });
        }

        // If active_session_token in DB is DIFFERENT from this client's token,
        // it means another device (e.g. CP / Cellphone or other PC) has logged into this account!
        const sessRes = await db.query(
          `SELECT device_name, device_type, browser, os, ip_address, login_at 
           FROM user_login_sessions 
           WHERE LOWER(email) = $1 AND is_active = true 
           ORDER BY id DESC LIMIT 1`,
          [email]
        );

        const newDevice = sessRes.rows.length > 0 ? sessRes.rows[0] : null;
        const devName = newDevice?.device_name || (newDevice?.device_type ? `${newDevice.device_type}` : 'Another Device');

        return res.status(200).json({
          success: false,
          isSessionTerminated: true,
          newDevice: newDevice || { device_name: devName, device_type: 'Device' },
          message: `Your account was accessed from a new device: ${devName}. You have been logged out from this session for your security.`,
        });
      }
    } catch (dbErr) {
      console.warn('[DB Warning] verifySession check fallback:', dbErr.message);
    }

    return res.status(200).json({ success: true, active: true });
  } catch (err) {
    console.error('Error in verifySession controller:', err);
    return res.status(200).json({ success: true, active: true });
  }
};

/**
 * GET /api/auth/devices
 * Retrieves active device and login history for the user
 */
exports.getUserDevices = async (req, res) => {
  try {
    const email = (req.query.email || req.headers['x-user-email'] || '').trim().toLowerCase();
    const currentToken = (req.query.token || req.headers['x-session-token'] || '').trim();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    let sessions = [];
    try {
      const dbRes = await db.query(
        `SELECT id, user_id, email, session_token, device_type, device_name, browser, os, ip_address, location, is_active, login_at, last_active_at, logout_at, logout_reason
         FROM user_login_sessions
         WHERE LOWER(email) = $1
         ORDER BY id DESC
         LIMIT 30`,
        [email]
      );
      sessions = dbRes.rows.map(row => ({
        id: row.id,
        email: row.email,
        sessionToken: row.session_token,
        deviceType: row.device_type,
        deviceName: row.device_name,
        browser: row.browser,
        os: row.os,
        ipAddress: row.ip_address,
        location: row.location,
        isActive: row.is_active,
        isCurrentDevice: currentToken ? (row.session_token === currentToken) : Boolean(row.is_active),
        loginAt: row.login_at,
        lastActiveAt: row.last_active_at,
        logoutAt: row.logout_at,
        logoutReason: row.logout_reason,
      }));
    } catch (dbErr) {
      console.warn('[DB Error] Fetching login sessions failed, checking memory:', dbErr.message);
    }

    if (sessions.length === 0) {
      sessions = memorySessions
        .filter(s => s.email.toLowerCase() === email)
        .map(s => ({
          ...s,
          isCurrentDevice: currentToken ? (s.sessionToken === currentToken) : Boolean(s.isActive),
        }));
    }

    // If still empty (e.g. legacy session without record), synthesize current device entry
    if (sessions.length === 0) {
      const devInfo = parseDeviceInfo(req);
      sessions = [{
        id: 1,
        email,
        sessionToken: currentToken || 'sess_current',
        deviceType: devInfo.deviceType,
        deviceName: devInfo.deviceName,
        browser: devInfo.browser,
        os: devInfo.os,
        ipAddress: devInfo.ipAddress,
        location: devInfo.location,
        isActive: true,
        isCurrentDevice: true,
        loginAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        logoutAt: null,
        logoutReason: null,
      }];
    }

    // Real-time sync for current device based on incoming client User-Agent
    const incomingDev = parseDeviceInfo(req);
    sessions = sessions.map(s => {
      if (s.isCurrentDevice) {
        if (incomingDev.os === 'Windows') {
          s.os = 'Windows';
          s.deviceType = 'PC';
          s.deviceName = incomingDev.deviceName;
          s.browser = incomingDev.browser;
        } else if (incomingDev.os === 'Android') {
          s.os = 'Android';
          s.deviceType = incomingDev.deviceType || 'CP (Cellphone)';
          s.deviceName = incomingDev.deviceName || `Android CP • ${incomingDev.browser}`;
          s.browser = incomingDev.browser;
        } else if (incomingDev.os === 'iOS') {
          s.os = 'iOS';
          s.deviceType = incomingDev.deviceType || 'CP (Cellphone)';
          s.deviceName = incomingDev.deviceName || `iPhone (CP) • ${incomingDev.browser}`;
          s.browser = incomingDev.browser;
        }
        try {
          db.query(
            `UPDATE user_login_sessions 
             SET os = $1, device_type = $2, device_name = $3, browser = $4 
             WHERE session_token = $5`,
            [s.os, s.deviceType, s.deviceName, s.browser, s.sessionToken]
          ).catch(() => {});
        } catch {}
      }
      return s;
    });

    return res.status(200).json({
      success: true,
      sessions,
    });
  } catch (err) {
    console.error('Error in getUserDevices controller:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving device sessions' });
  }
};

/**
 * POST /api/auth/devices/logout-others
 * Terminates all other active sessions except the requesting client
 */
exports.terminateAllOtherDevices = async (req, res) => {
  try {
    const { email, currentToken } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (currentToken) {
        // Automatically delete all other devices from database
        await db.query(
          `DELETE FROM user_login_sessions 
           WHERE LOWER(email) = $1 AND session_token != $2`,
          [cleanEmail, currentToken]
        );
        // Ensure user active_session_token is set to current token
        await db.query(`UPDATE users SET active_session_token = $1 WHERE LOWER(email) = $2`, [currentToken, cleanEmail]);
      } else {
        await db.query(
          `DELETE FROM user_login_sessions 
           WHERE LOWER(email) = $1`,
          [cleanEmail]
        );
      }
    } catch (dbErr) {
      console.warn('[DB Error] terminateAllOtherDevices failed:', dbErr.message);
    }

    memorySessions = memorySessions.filter(s => !(s.email.toLowerCase() === cleanEmail && s.sessionToken !== currentToken));

    return res.status(200).json({
      success: true,
      message: 'All other device sessions have been logged out and removed successfully.',
    });
  } catch (err) {
    console.error('Error in terminateAllOtherDevices:', err);
    return res.status(500).json({ success: false, message: 'Failed to logout other devices' });
  }
};

/**
 * DELETE /api/auth/devices/:id
 * Removes and deletes a specific device session record
 */
exports.removeDeviceSession = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id);

    try {
      await db.query(`DELETE FROM user_login_sessions WHERE id = $1`, [parseInt(cleanId, 10) || 0]);
    } catch (dbErr) {
      console.warn('[DB Error] removeDeviceSession failed:', dbErr.message);
    }

    memorySessions = memorySessions.filter(s => String(s.id) !== cleanId);

    return res.status(200).json({
      success: true,
      message: 'Device session removed successfully.',
    });
  } catch (err) {
    console.error('Error in removeDeviceSession:', err);
    return res.status(500).json({ success: false, message: 'Failed to remove device session' });
  }
};

/**
 * POST or DELETE /api/auth/devices/clear-history
 * Completely clears all previous device login sessions for this account
 */
exports.clearAllDeviceHistory = async (req, res) => {
  try {
    const email = (req.body?.email || req.query?.email || '').trim().toLowerCase();
    const currentToken = (req.body?.currentToken || req.query?.token || '').trim();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
      if (currentToken) {
        await db.query(
          `DELETE FROM user_login_sessions WHERE LOWER(email) = $1 AND session_token != $2`,
          [email, currentToken]
        );
      } else {
        await db.query(
          `DELETE FROM user_login_sessions WHERE LOWER(email) = $1 AND is_active = false`,
          [email]
        );
      }
    } catch (dbErr) {
      console.warn('[DB Error] clearAllDeviceHistory failed:', dbErr.message);
    }

    memorySessions = memorySessions.filter(
      s => s.email.toLowerCase() !== email || (currentToken ? s.sessionToken === currentToken : s.isActive)
    );

    return res.status(200).json({
      success: true,
      message: 'All previous device history has been removed.',
    });
  } catch (err) {
    console.error('Error in clearAllDeviceHistory:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear device history' });
  }
};


/**
 * GET /api/users/profile or GET /api/auth/profile
 * Retrieves registered user profile by email
 */
exports.getProfile = async (req, res) => {
  try {
    const email = (req.query.email || req.headers['x-user-email'] || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email parameter is required' });
    }

    try {
      const userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [email]);
      if (userRes.rows.length > 0) {
        const dbUser = userRes.rows[0];
        return res.status(200).json({
          success: true,
          user: {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.first_name || '',
            lastName: dbUser.last_name || '',
            middleName: dbUser.middle_name || '',
            suffix: dbUser.suffix || '',
            birthDate: dbUser.birth_date || '',
            birthMonth: dbUser.birth_month || '',
            birthDay: dbUser.birth_day || '',
            birthYear: dbUser.birth_year || '',
            city: dbUser.city || 'QUEZON CITY',
            barangay: dbUser.barangay || '',
            street: dbUser.street || '',
            houseNo: dbUser.house_no || '',
            workingInQC: dbUser.working_in_qc || 'No',
            occupation: dbUser.occupation || '',
            sex: dbUser.sex || 'FEMALE',
            bloodType: dbUser.blood_type || '',
            mobileNumber: dbUser.mobile_number || '',
            profilePhotoUrl: dbUser.profile_photo_url || null,
            qcidNumber: dbUser.qcid_number || '110000116932100',
            role: dbUser.role || 'user',
          },
        });
      }
    } catch (dbErr) {
      console.warn('[DB Error] getProfile failed:', dbErr.message);
    }

    const memUser = memoryUsers.find(u => u.email.toLowerCase() === email);
    if (memUser) {
      return res.status(200).json({ success: true, user: memUser });
    }

    return res.status(404).json({ success: false, message: 'User profile not found' });
  } catch (err) {
    console.error('Error in getProfile controller:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving profile', error: err.message });
  }
};

/**
 * PUT /api/users/profile or PUT /api/auth/profile
 * Updates editable profile fields for a registered user
 */
exports.updateProfile = async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      middleName,
      suffix,
      birthMonth,
      birthDay,
      birthYear,
      city,
      houseNo,
      street,
      barangay,
      workingInQC,
      occupation,
      sex,
      bloodType,
      mobileNumber,
      profilePhotoUrl,
    } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'User email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const finalBirthDate = (birthMonth && birthDay && birthYear) ? `${birthMonth} ${birthDay}, ${birthYear}` : '';

    try {
      const updateRes = await db.query(
        `UPDATE users SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          middle_name = COALESCE($3, middle_name),
          suffix = COALESCE($4, suffix),
          birth_date = COALESCE($5, birth_date),
          birth_month = COALESCE($6, birth_month),
          birth_day = COALESCE($7, birth_day),
          birth_year = COALESCE($8, birth_year),
          city = COALESCE($9, city),
          house_no = COALESCE($10, house_no),
          street = COALESCE($11, street),
          barangay = COALESCE($12, barangay),
          working_in_qc = COALESCE($13, working_in_qc),
          occupation = COALESCE($14, occupation),
          sex = COALESCE($15, sex),
          blood_type = COALESCE($16, blood_type),
          mobile_number = COALESCE($17, mobile_number),
          profile_photo_url = COALESCE($18, profile_photo_url),
          updated_at = NOW()
         WHERE LOWER(email) = $19
         RETURNING *`,
        [
          firstName, lastName, middleName, suffix,
          finalBirthDate, birthMonth, birthDay, birthYear,
          city, houseNo, street, barangay,
          workingInQC, occupation, sex, bloodType, mobileNumber,
          profilePhotoUrl, cleanEmail
        ]
      );

      if (updateRes.rows.length > 0) {
        const updated = updateRes.rows[0];
        const userPayload = {
          id: updated.id,
          email: updated.email,
          firstName: updated.first_name || '',
          lastName: updated.last_name || '',
          middleName: updated.middle_name || '',
          suffix: updated.suffix || '',
          birthDate: updated.birth_date || '',
          birthMonth: updated.birth_month || '',
          birthDay: updated.birth_day || '',
          birthYear: updated.birth_year || '',
          city: updated.city || 'QUEZON CITY',
          barangay: updated.barangay || '',
          street: updated.street || '',
          houseNo: updated.house_no || '',
          workingInQC: updated.working_in_qc || 'No',
          occupation: updated.occupation || '',
          sex: updated.sex || 'FEMALE',
          bloodType: updated.blood_type || '',
          mobileNumber: updated.mobile_number || '',
          profilePhotoUrl: updated.profile_photo_url || null,
          qcidNumber: updated.qcid_number || '110000116932100',
          role: updated.role || 'user',
        };

        return res.status(200).json({
          success: true,
          message: 'Profile updated successfully.',
          user: userPayload,
        });
      }
    } catch (dbErr) {
      console.warn('[DB Error] updateProfile DB update failed, updating memory:', dbErr.message);
    }

    // Fallback update memory
    const memUserIdx = memoryUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (memUserIdx !== -1) {
      memoryUsers[memUserIdx] = {
        ...memoryUsers[memUserIdx],
        firstName: firstName ?? memoryUsers[memUserIdx].firstName,
        lastName: lastName ?? memoryUsers[memUserIdx].lastName,
        middleName: middleName ?? memoryUsers[memUserIdx].middleName,
        suffix: suffix ?? memoryUsers[memUserIdx].suffix,
        birthMonth: birthMonth ?? memoryUsers[memUserIdx].birthMonth,
        birthDay: birthDay ?? memoryUsers[memUserIdx].birthDay,
        birthYear: birthYear ?? memoryUsers[memUserIdx].birthYear,
        city: city ?? memoryUsers[memUserIdx].city,
        houseNo: houseNo ?? memoryUsers[memUserIdx].houseNo,
        street: street ?? memoryUsers[memUserIdx].street,
        barangay: barangay ?? memoryUsers[memUserIdx].barangay,
        workingInQC: workingInQC ?? memoryUsers[memUserIdx].workingInQC,
        occupation: occupation ?? memoryUsers[memUserIdx].occupation,
        sex: sex ?? memoryUsers[memUserIdx].sex,
        mobileNumber: mobileNumber ?? memoryUsers[memUserIdx].mobileNumber,
        profilePhotoUrl: profilePhotoUrl ?? memoryUsers[memUserIdx].profilePhotoUrl,
        updatedAt: new Date().toISOString(),
      };

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        user: memoryUsers[memUserIdx],
      });
    }

    return res.status(404).json({ success: false, message: 'User not found to update' });
  } catch (err) {
    console.error('Error in updateProfile controller:', err);
    return res.status(500).json({ success: false, message: 'Server error updating profile', error: err.message });
  }
};

/**
 * POST /api/auth/forgot-password
 * Sends password reset instructions with a 6-digit OTP code and direct reset link to user's Gmail
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in DB or memory store
    let recipientName = 'Resident';
    try {
      const userRes = await db.query('SELECT first_name, last_name, email FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        recipientName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Resident';
      }
    } catch (dbErr) {
      console.warn('[DB Warning in forgotPassword]:', dbErr.message);
    }

    // Generate random 6-digit numeric OTP and token
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    // Save to Database
    try {
      await db.query(
        `INSERT INTO email_otps (email, otp_code, expires_at, is_used, created_at)
         VALUES ($1, $2, $3, false, NOW())`,
        [cleanEmail, otpCode, expiresAt]
      );
    } catch (dbErr) {
      console.warn('[DB Error] Saving Reset OTP to DB failed, using memory store:', dbErr.message);
    }

    // Always keep in memory store as fallback
    memoryOtps.set(cleanEmail, {
      otpCode,
      resetToken,
      expiresAt: expiresAt.getTime(),
      isUsed: false,
    });

    const frontendBase = (process.env.FRONTEND_URL || 'https://frontend-production-1c51.up.railway.app').replace(/\/+$/, '');
    const resetUrl = `${frontendBase}/reset-password?email=${encodeURIComponent(cleanEmail)}&otp=${otpCode}&token=${resetToken}`;

    console.log(`[Password Reset] Generated OTP ${otpCode} for ${cleanEmail}. Dispatching email...`);

    const emailResult = await sendPasswordResetEmail({
      recipientEmail: cleanEmail,
      otpCode,
      resetUrl,
      recipientName,
    });

    if (emailResult.success) {
      return res.status(200).json({
        success: true,
        message: `Password reset instructions and verification code have been sent to ${cleanEmail}.`,
        provider: emailResult.provider,
        email: cleanEmail,
      });
    } else {
      return res.status(200).json({
        success: true,
        message: `Password reset code generated for ${cleanEmail}. Check your inbox or proceed to reset.`,
        email: cleanEmail,
      });
    }
  } catch (err) {
    console.error('Error in forgotPassword controller:', err);
    return res.status(500).json({ success: false, message: 'Server error while processing password reset', error: err.message });
  }
};

/**
 * POST /api/auth/reset-password
 * Verifies OTP code and sets the new password for the account
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otpCode, newPassword } = req.body;

    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, verification code (OTP), and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    if (!/\d/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must include at least one number (0-9).' });
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must include at least one special character (e.g. !@#$%^&*).' });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must include at least one uppercase letter (A-Z).' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    let isValid = false;

    // 1. Verify in DB
    try {
      const dbRes = await db.query(
        `SELECT * FROM email_otps 
         WHERE LOWER(email) = $1 AND otp_code = $2 AND is_used = false AND expires_at > NOW()
         ORDER BY id DESC LIMIT 1`,
        [cleanEmail, cleanOtp]
      );

      if (dbRes.rows.length > 0) {
        isValid = true;
        await db.query(`UPDATE email_otps SET is_used = true WHERE id = $1`, [dbRes.rows[0].id]);
      }
    } catch (dbErr) {
      console.warn('[DB Error] Verifying Reset OTP in DB failed, checking memory:', dbErr.message);
    }

    // 2. Fallback verify in memory
    if (!isValid) {
      const memRecord = memoryOtps.get(cleanEmail);
      if (memRecord && !memRecord.isUsed && memRecord.otpCode === cleanOtp && memRecord.expiresAt > Date.now()) {
        isValid = true;
        memRecord.isUsed = true;
      }
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code (OTP). Please request a new password reset.',
      });
    }

    // Update user's password in Database with bcrypt hash
    const hashedNewPassword = await hashPassword(newPassword);

    try {
      const updateRes = await db.query(
        `UPDATE users SET password = $1, updated_at = NOW() WHERE LOWER(email) = $2 RETURNING id, email, first_name, last_name, role`,
        [hashedNewPassword, cleanEmail]
      );

      // If user wasn't found in DB, check memoryUsers or insert
      if (updateRes.rows.length === 0) {
        const memIdx = memoryUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
        if (memIdx !== -1) {
          memoryUsers[memIdx].password = hashedNewPassword;
        } else {
          await db.query(
            `INSERT INTO users (email, password, first_name, role, is_email_verified, created_at, updated_at)
             VALUES ($1, $2, 'Resident', 'user', true, NOW(), NOW())
             ON CONFLICT (email) DO UPDATE SET password = $2, updated_at = NOW()`,
            [cleanEmail, hashedNewPassword]
          );
        }
      }
    } catch (dbErr) {
      console.warn('[DB Error] Updating password failed:', dbErr.message);
      const memIdx = memoryUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (memIdx !== -1) {
        memoryUsers[memIdx].password = hashedNewPassword;
      }
    }

    memoryOtps.delete(cleanEmail);

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully updated! You can now sign in with your new password.',
    });
  } catch (err) {
    console.error('Error in resetPassword controller:', err);
    return res.status(500).json({ success: false, message: 'Server error while updating password', error: err.message });
  }
};

/**
 * POST /api/auth/change-password
 * Changes the authenticated user's password directly
 */
exports.changePassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check user in DB
    let userFound = false;
    let storedPassword = null;

    try {
      const userRes = await db.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (userRes.rows.length > 0) {
        userFound = true;
        storedPassword = userRes.rows[0].password;
      }
    } catch (dbErr) {
      console.warn('[DB Error] changePassword user lookup failed:', dbErr.message);
    }

    if (!userFound) {
      const memUser = memoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
      if (memUser) {
        userFound = true;
        storedPassword = memUser.password;
      }
    }

    if (!userFound) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Verify current password if provided
    if (currentPassword && storedPassword) {
      const isCurrentValid = await verifyPassword(currentPassword, storedPassword);
      if (!isCurrentValid) {
        return res.status(401).json({ success: false, message: 'Incorrect current password. Please try again.' });
      }
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update in DB
    try {
      await db.query('UPDATE users SET password = $1, updated_at = NOW() WHERE LOWER(email) = $2', [hashedNewPassword, cleanEmail]);
    } catch (dbErr) {
      console.warn('[DB Error] changePassword DB update failed:', dbErr.message);
    }

    // Update in memory
    const memIdx = memoryUsers.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (memIdx !== -1) {
      memoryUsers[memIdx].password = hashedNewPassword;
    }

    return res.status(200).json({
      success: true,
      message: 'Password successfully changed! Your new password is now active.',
    });
  } catch (err) {
    console.error('Error in changePassword controller:', err);
    return res.status(500).json({ success: false, message: 'Server error during password change', error: err.message });
  }
};


/**
 * GET /api/users or GET /api/auth/users
 * Returns all real registered user records directly from the central database
 */
exports.getAllUsers = async (req, res) => {
  try {
    // 1. Ensure required columns exist without breaking if previously missing
    try {
      await db.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS qcid_number VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR(150);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
      `);
    } catch (colErr) {
      // Non-fatal
    }

    // 2. Auto-sync existing module applicants and ensure default admin account exists
    try {
      const defaultHash = await hashPassword('default123');
      const adminHash = await hashPassword('admin123');

      // Auto-migrate any existing unhashed plain-text passwords in DB to bcrypt
      try {
        const plainUsers = await db.query("SELECT id, password FROM users WHERE password IS NOT NULL AND password NOT LIKE '$2%'");
        for (const row of plainUsers.rows) {
          if (row.password) {
            const hashed = await hashPassword(row.password);
            await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, row.id]).catch(() => {});
          }
        }
      } catch (e) {}

      await db.query(`
        -- Ensure default administrator account exists
        INSERT INTO users (email, password, first_name, last_name, role, status, is_email_verified, qcid_number)
        VALUES ('admin@quezoncity.gov.ph', '${adminHash}', 'System', 'Administrator', 'admin', 'active', true, '110000116932100')
        ON CONFLICT (email) DO UPDATE SET role = 'admin', status = 'active';

        -- Sync AICS applicants into users
        INSERT INTO users (email, password, first_name, last_name, middle_name, suffix, mobile_number, qcid_number, role, status, is_email_verified, created_at)
        SELECT DISTINCT ON (LOWER(email))
          LOWER(email), '${defaultHash}', first_name, last_name, middle_name, suffix, phone, qc_id, 'user', 'active', true, created_at
        FROM aics_applications
        WHERE email IS NOT NULL AND email != '' AND LOWER(email) NOT IN (SELECT LOWER(email) FROM users)
        ON CONFLICT (email) DO NOTHING;

        -- Sync PWD / Senior applicants into users
        INSERT INTO users (email, password, first_name, last_name, middle_name, suffix, mobile_number, qcid_number, role, status, is_email_verified, created_at)
        SELECT DISTINCT ON (LOWER(email))
          LOWER(email), '${defaultHash}', first_name, last_name, middle_name, suffix, contact_no, COALESCE(assigned_id_number, reference_number), 'user', 'active', true, submitted_at
        FROM pwd_senior_applications
        WHERE email IS NOT NULL AND email != '' AND LOWER(email) NOT IN (SELECT LOWER(email) FROM users)
        ON CONFLICT (email) DO NOTHING;

        -- Sync Solo Parent applicants into users
        INSERT INTO users (email, password, first_name, last_name, middle_name, suffix, mobile_number, qcid_number, role, status, is_email_verified, created_at)
        SELECT DISTINCT ON (LOWER(email))
          LOWER(email), '${defaultHash}', first_name, last_name, middle_name, suffix, contact_no, COALESCE(solo_parent_id_number, qcid_number), 'user', 'active', true, created_at
        FROM solo_parent_child_welfare_applications
        WHERE email IS NOT NULL AND email != '' AND LOWER(email) NOT IN (SELECT LOWER(email) FROM users)
        ON CONFLICT (email) DO NOTHING;

        -- Sync Child Welfare guardians into users
        INSERT INTO users (email, password, first_name, last_name, middle_name, mobile_number, role, status, is_email_verified, created_at)
        SELECT DISTINCT ON (LOWER(guardian_email))
          LOWER(guardian_email), '${defaultHash}', guardian_first_name, guardian_last_name, guardian_middle_name, guardian_contact_no, 'user', 'active', true, created_at
        FROM solo_parent_child_welfare_applications
        WHERE module_type = 'CHILD_WELFARE' AND guardian_email IS NOT NULL AND guardian_email != '' AND LOWER(guardian_email) NOT IN (SELECT LOWER(email) FROM users)
        ON CONFLICT (email) DO NOTHING;

        -- Sync Livelihood applicants into users
        INSERT INTO users (email, password, first_name, last_name, mobile_number, qcid_number, role, status, is_email_verified, created_at)
        SELECT DISTINCT ON (LOWER(email))
          LOWER(email), '${defaultHash}', first_name, last_name, contact_no, qcid_no, 'user', 'active', true, created_at
        FROM livelihood_applications
        WHERE email IS NOT NULL AND email != '' AND LOWER(email) NOT IN (SELECT LOWER(email) FROM users)
        ON CONFLICT (email) DO NOTHING;
      `);
    } catch (syncErr) {
      console.warn('[DB Note] Auto-syncing applicants to users table:', syncErr.message);
    }

    let dbUsers = [];
    try {
      // Strictly standardize all existing names in database to UPPERCASE
      await db.query(`
        UPDATE users 
        SET first_name = UPPER(first_name), 
            middle_name = UPPER(middle_name), 
            last_name = UPPER(last_name), 
            suffix = UPPER(suffix);
      `).catch(() => {});

      const result = await db.query(`SELECT * FROM users ORDER BY id ASC`);
      dbUsers = result.rows || [];
    } catch (dbErr) {
      console.warn('[DB Warning] Fetching users from DB failed, falling back to memory store:', dbErr.message);
    }

    // Combine with memory users if any exist that are not in DB
    const seenEmails = new Set(dbUsers.map(u => (u.email || '').toLowerCase()));
    for (const memU of memoryUsers) {
      if (memU && memU.email && !seenEmails.has(memU.email.toLowerCase())) {
        seenEmails.add(memU.email.toLowerCase());
        dbUsers.push({
          id: memU.id || dbUsers.length + 1,
          email: memU.email,
          first_name: memU.firstName || memU.first_name || '',
          last_name: memU.lastName || memU.last_name || '',
          middle_name: memU.middleName || memU.middle_name || '',
          suffix: memU.suffix || '',
          mobile_number: memU.mobileNumber || memU.mobile_number || '',
          qcid_number: memU.qcidNumber || memU.qcid_number || '',
          role: memU.role || 'user',
          status: memU.status || 'active',
          created_at: memU.createdAt || memU.created_at || new Date().toISOString(),
          updated_at: memU.updatedAt || memU.updated_at || new Date().toISOString(),
          last_login: memU.lastLogin || memU.last_login || null,
          city: memU.city || '',
          barangay: memU.barangay || '',
          street: memU.street || '',
          house_no: memU.houseNo || memU.house_no || '',
          occupation: memU.occupation || '',
        });
      }
    }

    // Build user representations with connected applications counts
    const users = await Promise.all(
      dbUsers.map(async (u) => {
        const userQcid = u.qcid_number || u.qcid || `110000${String(u.id).padStart(9, '0')}`;
        const userEmail = (u.email || '').toLowerCase();
        const userIdStr = String(u.id);

        let totalApps = 0;
        let appointmentCount = 0;

        try {
          const [aicsRes, pwdRes, soloRes, childRes, liveRes, aptRes] = await Promise.all([
            db.query(
              `SELECT COUNT(*) FROM aics_applications WHERE (email IS NOT NULL AND LOWER(email) = $1) OR (qc_id IS NOT NULL AND qc_id = $2)`,
              [userEmail, userQcid]
            ).catch(() => ({ rows: [{ count: 0 }] })),
            db.query(
              `SELECT COUNT(*) FROM pwd_senior_applications WHERE (email IS NOT NULL AND LOWER(email) = $1) OR (reference_number IS NOT NULL AND reference_number = $2)`,
              [userEmail, userQcid]
            ).catch(() => ({ rows: [{ count: 0 }] })),
            db.query(
              `SELECT COUNT(*) FROM solo_parent_child_welfare_applications WHERE (module_type = 'SOLO_PARENT' OR module_type IS NULL) AND (user_id = $1 OR (email IS NOT NULL AND LOWER(email) = $2) OR (qcid_number IS NOT NULL AND qcid_number = $3))`,
              [userIdStr, userEmail, userQcid]
            ).catch(() => ({ rows: [{ count: 0 }] })),
            db.query(
              `SELECT COUNT(*) FROM solo_parent_child_welfare_applications WHERE module_type = 'CHILD_WELFARE' AND (user_id = $1 OR (guardian_email IS NOT NULL AND LOWER(guardian_email) = $2) OR (email IS NOT NULL AND LOWER(email) = $2))`,
              [userIdStr, userEmail]
            ).catch(() => ({ rows: [{ count: 0 }] })),
            db.query(
              `SELECT COUNT(*) FROM livelihood_applications WHERE user_id = $1 OR (email IS NOT NULL AND LOWER(email) = $2) OR (qcid_no IS NOT NULL AND qcid_no = $3)`,
              [userIdStr, userEmail, userQcid]
            ).catch(() => ({ rows: [{ count: 0 }] })),
            db.query(
              `SELECT COUNT(*) FROM appointments WHERE (email IS NOT NULL AND LOWER(email) = $1) OR (qcid_no IS NOT NULL AND qcid_no = $2)`,
              [userEmail, userQcid]
            ).catch(() => ({ rows: [{ count: 0 }] })),
          ]);

          const aicsCount = parseInt(aicsRes.rows[0]?.count || 0, 10);
          const pwdCount = parseInt(pwdRes.rows[0]?.count || 0, 10);
          const soloCount = parseInt(soloRes.rows[0]?.count || 0, 10);
          const childCount = parseInt(childRes.rows[0]?.count || 0, 10);
          const liveCount = parseInt(liveRes.rows[0]?.count || 0, 10);
          appointmentCount = parseInt(aptRes.rows[0]?.count || 0, 10);

          totalApps = aicsCount + pwdCount + soloCount + childCount + liveCount;
        } catch {}

        const rawFullName = [u.first_name, u.middle_name, u.last_name, u.suffix]
          .filter(Boolean)
          .join(' ')
          .trim() || (String(u.role || '').toLowerCase() === 'admin' || u.email === 'admin' ? 'System Administrator' : 'Registered Resident');

        const fullName = rawFullName.toUpperCase();

        const isAdmin = ['admin', 'administrator', 'super_admin'].includes(String(u.role || '').toLowerCase()) || u.email === 'admin' || u.email === 'admin@quezoncity.gov.ph';
        const displayRole = isAdmin ? 'ADMINISTRATOR' : 'USER / BENEFICIARY';
        const isInactive = String(u.status || 'active').toLowerCase() === 'inactive' || String(u.status || 'active').toLowerCase() === 'deactivated';
        const displayStatus = isInactive ? 'INACTIVE' : 'ACTIVE';

        const rawId = String(u.id);
        const formattedId = rawId.startsWith('USR-') || rawId.startsWith('ADMIN-')
          ? rawId
          : isAdmin
            ? `ADMIN-${rawId.padStart(4, '0')}`
            : `USR-${rawId.padStart(4, '0')}`;

        const cleanDisplayEmail = u.email === 'admin' ? 'admin@quezoncity.gov.ph' : u.email;

        return {
          id: formattedId,
          numericId: u.id,
          qcidNumber: userQcid,
          name: fullName,
          firstName: (u.first_name || '').toUpperCase(),
          lastName: (u.last_name || '').toUpperCase(),
          middleName: (u.middle_name || '').toUpperCase(),
          suffix: (u.suffix || '').toUpperCase(),
          email: cleanDisplayEmail,
          contactNumber: u.mobile_number || u.phone || u.contact_no || '—',
          role: displayRole,
          status: displayStatus,
          dateRegistered: u.created_at || u.createdat || new Date().toISOString(),
          lastLogin: u.last_login || u.lastlogin || u.updated_at || u.created_at || new Date().toISOString(),
          applicationsCount: totalApps,
          appointmentsCount: appointmentCount,
          address: [u.house_no, u.street, u.barangay, u.city].filter(Boolean).join(', ') || u.address || 'Quezon City',
          occupation: u.occupation || '—',
        };
      })
    );

    // Ensure all unique accounts are present
    const uniqueMap = new Map();
    for (const userItem of users) {
      const key = (userItem.email || '').toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, userItem);
      }
    }
    const cleanUsers = Array.from(uniqueMap.values());

    const stats = {
      total: cleanUsers.length,
      active: cleanUsers.filter(u => u.status === 'ACTIVE').length,
      inactive: cleanUsers.filter(u => u.status === 'INACTIVE').length,
      administrators: cleanUsers.filter(u => u.role === 'ADMINISTRATOR').length,
    };

    return res.status(200).json({
      success: true,
      stats,
      users: cleanUsers,
    });
  } catch (err) {
    console.error('Error in getAllUsers controller:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving users', error: err.message });
  }
};

/**
 * GET /api/users/:id
 * Returns a user with all linked application records across modules
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id).replace(/\D/g, '');

    let dbUser = null;
    try {
      const userRes = await db.query('SELECT * FROM users WHERE id = $1 OR qcid_number = $2 OR LOWER(email) = $3', [cleanId || '0', id, String(id).toLowerCase()]);
      if (userRes.rows.length > 0) {
        dbUser = userRes.rows[0];
      }
    } catch (dbErr) {
      console.warn('[DB Error] getUserById failed:', dbErr.message);
    }

    if (!dbUser) {
      const memUser = memoryUsers.find(u => String(u.id) === String(id) || u.email.toLowerCase() === String(id).toLowerCase() || u.qcidNumber === id);
      if (memUser) {
        dbUser = {
          id: memUser.id || 1,
          email: memUser.email,
          first_name: memUser.firstName || memUser.first_name || '',
          last_name: memUser.lastName || memUser.last_name || '',
          middle_name: memUser.middleName || memUser.middle_name || '',
          suffix: memUser.suffix || '',
          mobile_number: memUser.mobileNumber || memUser.mobile_number || '',
          qcid_number: memUser.qcidNumber || memUser.qcid_number || '',
          role: memUser.role || 'user',
          status: memUser.status || 'active',
          created_at: memUser.createdAt || new Date().toISOString(),
          updated_at: memUser.updatedAt || new Date().toISOString(),
          last_login: memUser.lastLogin || null,
        };
      }
    }

    if (!dbUser) {
      return res.status(404).json({ success: false, message: 'User record not found' });
    }

    const userEmail = (dbUser.email || '').toLowerCase();
    const userQcid = dbUser.qcid_number || '';
    const userIdStr = String(dbUser.id);

    // Fetch related records
    const [aics, pwdSenior, soloParent, childWelfare, livelihood, appointments, cases] = await Promise.all([
      db.query(
        `SELECT reference_no as reference_number, category, assistance_title, status, created_at FROM aics_applications WHERE LOWER(email) = $1 OR qc_id = $2`,
        [userEmail, userQcid]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT reference_number, category, type, status, assigned_id_number, submitted_at as created_at FROM pwd_senior_applications WHERE LOWER(email) = $1 OR reference_number = $2`,
        [userEmail, userQcid]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT reference_number, 'Solo Parent' as category, application_type as type, application_status as status, solo_parent_id_number, assigned_id_number, created_at FROM solo_parent_child_welfare_applications WHERE (module_type = 'SOLO_PARENT' OR module_type IS NULL) AND (user_id = $1 OR LOWER(email) = $2 OR qcid_number = $3)`,
        [userIdStr, userEmail, userQcid]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT reference_number, 'Child Welfare' as category, category_title as type, application_status as status, created_at FROM solo_parent_child_welfare_applications WHERE module_type = 'CHILD_WELFARE' AND (user_id = $1 OR LOWER(guardian_email) = $2 OR LOWER(email) = $2)`,
        [userIdStr, userEmail]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT reference_number, 'Livelihood & Training' as category, assistance_type as type, status, created_at FROM livelihood_applications WHERE user_id = $1 OR LOWER(email) = $2 OR qcid_no = $3`,
        [userIdStr, userEmail, userQcid]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT appointment_reference, service_type, appointment_date, appointment_time, status FROM appointments WHERE LOWER(email) = $1 OR qcid_no = $2`,
        [userEmail, userQcid]
      ).catch(() => ({ rows: [] })),
      db.query(
        `SELECT case_number, application_ref, program, case_type, status, priority, date_opened FROM case_records WHERE beneficiary_qcid = $1 OR LOWER(beneficiary_name) LIKE LOWER($2)`,
        [userQcid, `%${dbUser.first_name || ''} ${dbUser.last_name || ''}%`]
      ).catch(() => ({ rows: [] })),
    ]);

    const allApps = [
      ...aics.rows.map(r => ({ ...r, module: 'AICS Assistance' })),
      ...pwdSenior.rows.map(r => ({ ...r, module: r.category || 'PWD / Senior Citizen' })),
      ...soloParent.rows.map(r => ({ ...r, module: 'Solo Parent Services' })),
      ...childWelfare.rows.map(r => ({ ...r, module: 'Child Welfare Services' })),
      ...livelihood.rows.map(r => ({ ...r, module: 'Livelihood & Training' })),
    ];

    const fullName = [dbUser.first_name, dbUser.middle_name, dbUser.last_name, dbUser.suffix]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Resident User';

    const isAdmin = ['admin', 'administrator', 'super_admin'].includes(String(dbUser.role || '').toLowerCase());

    return res.status(200).json({
      success: true,
      user: {
        id: `USR-${String(dbUser.id).padStart(4, '0')}`,
        numericId: dbUser.id,
        qcidNumber: dbUser.qcid_number || `110000${String(dbUser.id).padStart(9, '0')}`,
        name: fullName.toUpperCase(),
        firstName: (dbUser.first_name || '').toUpperCase(),
        lastName: (dbUser.last_name || '').toUpperCase(),
        middleName: (dbUser.middle_name || '').toUpperCase(),
        suffix: (dbUser.suffix || '').toUpperCase(),
        email: dbUser.email,
        contactNumber: dbUser.mobile_number || '—',
        role: isAdmin ? 'ADMINISTRATOR' : 'USER / BENEFICIARY',
        status: String(dbUser.status || 'active').toLowerCase() === 'inactive' ? 'INACTIVE' : 'ACTIVE',
        dateRegistered: dbUser.created_at,
        lastLogin: dbUser.last_login || dbUser.updated_at || dbUser.created_at,
        city: dbUser.city || 'QUEZON CITY',
        barangay: dbUser.barangay || '',
        street: dbUser.street || '',
        houseNo: dbUser.house_no || '',
        occupation: dbUser.occupation || '—',
        sex: dbUser.sex || '—',
        birthDate: dbUser.birth_date || '—',
        applications: allApps,
        appointments: appointments.rows,
        cases: cases.rows,
      },
    });
  } catch (err) {
    console.error('Error in getUserById controller:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving user details', error: err.message });
  }
};

/**
 * PATCH /api/users/:id/status or POST /api/users/:id/toggle-status
 * Updates user account status between ACTIVE and INACTIVE
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const cleanId = String(id).replace(/\D/g, '');

    let newStatus = status;

    // If no explicit status provided, toggle from current
    if (!newStatus) {
      const existing = await db.query('SELECT status FROM users WHERE id = $1', [cleanId]);
      if (existing.rows.length > 0) {
        const curr = String(existing.rows[0].status || 'active').toLowerCase();
        newStatus = curr === 'active' ? 'inactive' : 'active';
      } else {
        newStatus = 'inactive';
      }
    }

    const normStatus = newStatus.toLowerCase() === 'inactive' ? 'inactive' : 'active';

    await db.query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 OR qcid_number = $3 OR LOWER(email) = $4`,
      [normStatus, cleanId || '0', id, String(id).toLowerCase()]
    );

    // Also update in memory store if present
    const memUser = memoryUsers.find(u => String(u.id) === String(id) || u.email.toLowerCase() === String(id).toLowerCase());
    if (memUser) {
      memUser.status = normStatus;
    }

    return res.status(200).json({
      success: true,
      message: `Account status successfully updated to ${normStatus.toUpperCase()}`,
      status: normStatus.toUpperCase(),
    });
  } catch (err) {
    console.error('Error in toggleUserStatus controller:', err);
    return res.status(500).json({ success: false, message: 'Failed to update account status', error: err.message });
  }
};

/**
 * PUT /api/users/:id
 * Updates editable user account fields (Name, Contact No, Role, Status)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id).replace(/\D/g, '');
    const { firstName, lastName, middleName, suffix, mobileNumber, contactNumber, role, status } = req.body;

    const contact = mobileNumber || contactNumber;
    const normRole = (role && String(role).toLowerCase().includes('admin')) ? 'admin' : 'user';
    const normStatus = (status && String(status).toLowerCase().includes('inactive')) ? 'inactive' : 'active';
    const cleanFirst = firstName ? String(firstName).trim().toUpperCase() : null;
    const cleanLast = lastName ? String(lastName).trim().toUpperCase() : null;
    const cleanMiddle = middleName ? String(middleName).trim().toUpperCase() : null;
    const cleanSuffix = suffix ? String(suffix).trim().toUpperCase() : null;

    const updateRes = await db.query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        middle_name = COALESCE($3, middle_name),
        suffix = COALESCE($4, suffix),
        mobile_number = COALESCE($5, mobile_number),
        role = COALESCE($6, role),
        status = COALESCE($7, status),
        updated_at = NOW()
       WHERE id = $8 OR qcid_number = $9 OR LOWER(email) = $10
       RETURNING id, email, first_name, last_name, middle_name, suffix, mobile_number, qcid_number, role, status, updated_at`,
      [cleanFirst, cleanLast, cleanMiddle, cleanSuffix, contact, normRole, normStatus, cleanId || '0', id, String(id).toLowerCase()]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User record not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'User account updated successfully',
      user: updateRes.rows[0],
    });
  } catch (err) {
    console.error('Error in updateUser controller:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user account', error: err.message });
  }
};

/**
 * DELETE /api/users/:id
 * Deletes user account
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = String(id).replace(/\D/g, '');

    await db.query('DELETE FROM users WHERE id = $1 OR qcid_number = $2 OR LOWER(email) = $3', [cleanId || '0', id, String(id).toLowerCase()]);
    try {
      await db.query('DELETE FROM user_login_sessions WHERE LOWER(email) = $1', [String(id).toLowerCase()]);
    } catch (_) {}
    memoryUsers = memoryUsers.filter(u => String(u.id) !== String(id) && u.email.toLowerCase() !== String(id).toLowerCase());

    return res.status(200).json({
      success: true,
      message: 'User account deleted successfully',
    });
  } catch (err) {
    console.error('Error in deleteUser controller:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete user account', error: err.message });
  }
};

/**
 * GET /api/auth/migrate-passwords
 * Manually trigger password migration for all plaintext accounts in DB
 */
exports.migrateAllPasswords = async (req, res) => {
  try {
    const plainUsers = await db.query("SELECT id, email, password FROM users WHERE password IS NOT NULL AND password NOT LIKE '$2%'");
    let count = 0;
    for (const row of plainUsers.rows) {
      if (row.password) {
        const hashed = await hashPassword(row.password);
        await db.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, row.id]);
        count++;
      }
    }
    return res.status(200).json({
      success: true,
      message: `Successfully migrated ${count} user password(s) to bcrypt.`,
      migratedCount: count,
    });
  } catch (err) {
    console.error('Error in migrateAllPasswords controller:', err);
    return res.status(500).json({ success: false, message: 'Failed to migrate passwords', error: err.message });
  }
};



