const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { sendOtpLimiter, loginRateLimiter } = require('../middleware/rateLimiter');
const botProtection = require('../middleware/botProtection');

// POST /api/auth/send-otp (Rate limit: 3 requests per 5 minutes + Bot Protection)
router.post('/send-otp', sendOtpLimiter, botProtection, authController.sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', botProtection, authController.verifyOtp);

// POST /api/auth/register (Bot Protection + Honeypot verification)
router.post('/register', botProtection, authController.register);

// POST /api/auth/login (Rate limit & brute-force + Bot Protection)
router.post('/login', loginRateLimiter, botProtection, authController.login);

// GET /api/auth/lockout-status
router.get('/lockout-status', authController.getLockoutStatus);

// POST /api/auth/forgot-password
router.post('/forgot-password', botProtection, authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', botProtection, authController.resetPassword);

// POST /api/auth/change-password
router.post('/change-password', authController.changePassword);

// POST /api/auth/reactivate
router.post('/reactivate', authController.reactivateAccount);

// GET /api/auth/verify-session
router.get('/verify-session', authController.verifySession);
router.post('/verify-session', authController.verifySession);

// Device Management / Login History
router.get('/devices', authController.getUserDevices);
router.post('/devices/logout-others', authController.terminateAllOtherDevices);
router.delete('/devices/clear-history', authController.clearAllDeviceHistory);
router.post('/devices/clear-history', authController.clearAllDeviceHistory);
router.delete('/devices/:id', authController.removeDeviceSession);



// GET /api/auth/migrate-passwords
router.get('/migrate-passwords', authController.migrateAllPasswords);
router.post('/migrate-passwords', authController.migrateAllPasswords);

// GET /api/auth/profile & GET /api/users/profile
router.get('/profile', authController.getProfile);

// PUT /api/auth/profile & PUT /api/users/profile
router.put('/profile', authController.updateProfile);

// Admin User Management routes (/api/users and /api/auth/users)
router.get('/', authController.getAllUsers);
router.get('/all', authController.getAllUsers);
router.get('/users', authController.getAllUsers);
router.get('/:id', authController.getUserById);
router.put('/:id', authController.updateUser);
router.patch('/:id/status', authController.toggleUserStatus);
router.post('/:id/toggle-status', authController.toggleUserStatus);
router.delete('/:id', authController.deleteUser);

module.exports = router;
