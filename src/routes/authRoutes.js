import express from 'express';
import * as authController from '../modules/auth/authController.js';
import { validateRequestBody, validateQueryParams } from '../middlewares/validation.js';

const router = express.Router();

/**
 * Registration Flow
 */

// POST /api/auth/register
// Body: { email, phone, password }
// Response: { success, message, email, otp_expires_at, otp_expires_in_seconds }
router.post('/register', validateRequestBody(['email', 'phone', 'password']), authController.registerController);

// POST /api/auth/register/verify-otp
// Body: { email, otp }
// Response: { success, message, user, token }
router.post(
  '/register/verify-otp',
  validateRequestBody(['email', 'otp']),
  authController.verifyRegistrationOtpController
);

/**
 * Login Flow
 */

// POST /api/auth/login
// Body: { email, password }
// Response: { success, message, email, user_id, otp_expires_at, otp_expires_in_seconds }
router.post('/login', validateRequestBody(['email', 'password']), authController.loginController);

// POST /api/auth/login/verify-otp
// Body: { email, otp }
// Response: { success, message, user, token }
router.post(
  '/login/verify-otp',
  validateRequestBody(['email', 'otp']),
  authController.verifyLoginOtpController
);

/**
 * OTP Management
 */

// POST /api/auth/resend-otp
// Body: { email, purpose: 'login' | 'registration' }
// Response: { success, message, email, otp_expires_at, otp_expires_in_seconds }
router.post('/resend-otp', validateRequestBody(['email']), authController.resendOtpController);

// GET /api/auth/otp-status?email=user@example.com&purpose=login
// Response: { success, data: { expiresAt, expiresInSeconds, attemptCount, attemptsRemaining, isBlocked, blockedUntilSeconds } }
router.get('/otp-status', authController.getOtpStatusController);

/**
 * Token Verification
 */

// POST /api/auth/verify
// Headers: Authorization: Bearer <token>
// Response: { success, user: { userId, email } }
router.post('/verify', authController.verifyTokenController);

export default router;
