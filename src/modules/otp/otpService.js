import { query, getOne, getMany } from '../../config/database.js';
import {
  generateOtp,
  isValidOtpFormat,
  calculateExpiry,
  isExpired,
  getSecondsUntilExpiry,
  isBlockedFromResend,
  getSecondsUntilUnblock,
} from '../../utils/crypto.js';
import { hashOtp, compareOtp } from '../../utils/hash.js';
import appConfig from '../../config/app.js';
import logger from '../../utils/logger.js';

/**
 * Create an OTP session for login or registration
 * @param {string} email - User email
 * @param {string} purpose - 'login' or 'registration'
 * @returns {Promise<object>} OTP session with expiry info
 */
export const createOtpSession = async (email, purpose = 'login') => {
  if (!email || !['login', 'registration'].includes(purpose)) {
    throw new Error('Invalid email or purpose');
  }

  try {
    // Delete any existing OTP session for this user and purpose
    await deleteOtpSession(email, purpose);

    // Generate OTP
    const plainOtp = generateOtp();
    const hashedOtp = await hashOtp(plainOtp);

    // Calculate expiry
    const expiryTimestamp = calculateExpiry(appConfig.otp.expiryMinutes);

    // Create OTP session
    const result = await query(
      `INSERT INTO otp_sessions (email, otp_hash, attempt_count, expires_at, purpose)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, attempt_count, blocked_until, expires_at`,
      [email, hashedOtp, 0, expiryTimestamp, purpose]
    );

    const otpSession = result.rows[0];

    // Log successful OTP creation without exposing the OTP
    logger.info('OTP session created', {
      email,
      purpose,
      expiresAt: otpSession.expires_at,
    });

    // Return OTP and session info (OTP is returned HERE ONLY for immediate delivery to email)
    return {
      otp: plainOtp, // ONLY used for sending to email service
      session: {
        id: otpSession.id,
        email: otpSession.email,
        expiresAt: otpSession.expires_at,
        expiresInSeconds: getSecondsUntilExpiry(otpSession.expires_at),
      },
    };
  } catch (error) {
    logger.error('Failed to create OTP session', {
      email,
      purpose,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Verify OTP and check attempt count and expiry
 * @param {string} email - User email
 * @param {string} plainOtp - Plain text OTP from user
 * @param {string} purpose - 'login' or 'registration'
 * @returns {Promise<boolean>} True if OTP is valid
 */
export const verifyOtp = async (email, plainOtp, purpose = 'login') => {
  if (!email || !plainOtp || !['login', 'registration'].includes(purpose)) {
    throw new Error('Invalid parameters for OTP verification');
  }

  if (!isValidOtpFormat(plainOtp)) {
    throw new Error('Invalid OTP format');
  }

  try {
    // Get the OTP session
    const otpSession = await getOne(
      `SELECT * FROM otp_sessions 
       WHERE email = $1 AND purpose = $2
       ORDER BY created_at DESC LIMIT 1`,
      [email, purpose]
    );

    // Check if OTP session exists
    if (!otpSession) {
      logger.warn('OTP session not found', {
        email,
        purpose,
      });
      throw new Error('No active OTP session found');
    }

    // Check if OTP has expired
    if (isExpired(otpSession.expires_at)) {
      await deleteOtpSession(email, purpose);
      logger.warn('OTP expired', {
        email,
        purpose,
      });
      throw new Error('OTP has expired');
    }

    // Check if user is blocked due to too many attempts
    if (otpSession.blocked_until && isBlockedFromResend(otpSession.blocked_until)) {
      const secondsRemaining = getSecondsUntilUnblock(otpSession.blocked_until);
      logger.warn('OTP verification blocked due to too many attempts', {
        email,
        purpose,
        blockedUntilSeconds: secondsRemaining,
      });
      throw new Error(
        `Too many attempts. Please try again after ${Math.ceil(secondsRemaining / 60)} minutes`
      );
    }

    // Compare OTP hash
    const isOtpValid = await compareOtp(plainOtp, otpSession.otp_hash);

    if (!isOtpValid) {
      // Increment attempt count
      const newAttemptCount = otpSession.attempt_count + 1;

      let updateQuery = `UPDATE otp_sessions 
                         SET attempt_count = $1, updated_at = CURRENT_TIMESTAMP
                         WHERE id = $2`;
      const params = [newAttemptCount, otpSession.id];

      // If max attempts reached, set block_until timestamp
      if (newAttemptCount >= appConfig.otp.maxAttempts) {
        const blockedUntil = calculateExpiry(appConfig.otp.resendCooldownMinutes);
        updateQuery = `UPDATE otp_sessions 
                       SET attempt_count = $1, blocked_until = $2, updated_at = CURRENT_TIMESTAMP
                       WHERE id = $3`;
        params.push(blockedUntil);
        logger.warn('OTP max attempts reached, user blocked', {
          email,
          purpose,
          blockedUntilMinutes: appConfig.otp.resendCooldownMinutes,
        });
      }

      await query(updateQuery, params);

      logger.warn('Invalid OTP attempt', {
        email,
        purpose,
        attemptCount: newAttemptCount,
      });

      throw new Error(
        `Invalid OTP. ${appConfig.otp.maxAttempts - newAttemptCount} attempts remaining`
      );
    }

    // OTP is valid - mark as used and return success
    logger.info('OTP verified successfully', {
      email,
      purpose,
    });

    return true;
  } catch (error) {
    logger.error('OTP verification failed', {
      email,
      purpose,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Delete OTP session after successful verification
 * @param {string} email - User email
 * @param {string} purpose - 'login' or 'registration'
 * @returns {Promise<void>}
 */
export const deleteOtpSession = async (email, purpose = 'login') => {
  try {
    await query(
      `DELETE FROM otp_sessions WHERE email = $1 AND purpose = $2`,
      [email, purpose]
    );

    logger.info('OTP session deleted', {
      email,
      purpose,
    });
  } catch (error) {
    logger.error('Failed to delete OTP session', {
      email,
      purpose,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get OTP session details (without OTP hash)
 * Used by frontend to show timers
 * @param {string} email - User email
 * @param {string} purpose - 'login' or 'registration'
 * @returns {Promise<object|null>} OTP session details
 */
export const getOtpSessionDetails = async (email, purpose = 'login') => {
  try {
    const otpSession = await getOne(
      `SELECT id, email, attempt_count, blocked_until, expires_at
       FROM otp_sessions 
       WHERE email = $1 AND purpose = $2
       ORDER BY created_at DESC LIMIT 1`,
      [email, purpose]
    );

    if (!otpSession) {
      return null;
    }

    const expiresInSeconds = getSecondsUntilExpiry(otpSession.expires_at);
    const isBlocked = isBlockedFromResend(otpSession.blocked_until);
    const blockedUntilSeconds = getSecondsUntilUnblock(otpSession.blocked_until);

    return {
      id: otpSession.id,
      email: otpSession.email,
      expiresAt: otpSession.expires_at,
      expiresInSeconds,
      hasExpired: expiresInSeconds === 0,
      attemptCount: otpSession.attempt_count,
      attemptsRemaining: Math.max(0, appConfig.otp.maxAttempts - otpSession.attempt_count),
      isBlocked,
      blockedUntil: isBlocked ? otpSession.blocked_until : null,
      blockedUntilSeconds: blockedUntilSeconds,
    };
  } catch (error) {
    logger.error('Failed to get OTP session details', {
      email,
      purpose,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Clean up expired OTP sessions
 * Can be called periodically or on-demand
 * @returns {Promise<number>} Number of deleted sessions
 */
export const cleanupExpiredOtpSessions = async () => {
  try {
    const result = await query(
      `DELETE FROM otp_sessions WHERE expires_at < CURRENT_TIMESTAMP`
    );

    if (result.rowCount > 0) {
      logger.info('Cleaned up expired OTP sessions', {
        count: result.rowCount,
      });
    }

    return result.rowCount;
  } catch (error) {
    logger.error('Failed to cleanup expired OTP sessions', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Clean up expired pending registrations
 * @returns {Promise<number>} Number of deleted records
 */
export const cleanupExpiredRegistrations = async () => {
  try {
    const result = await query(
      `DELETE FROM pending_registrations WHERE expires_at < CURRENT_TIMESTAMP`
    );

    if (result.rowCount > 0) {
      logger.info('Cleaned up expired pending registrations', {
        count: result.rowCount,
      });
    }

    return result.rowCount;
  } catch (error) {
    logger.error('Failed to cleanup expired pending registrations', {
      error: error.message,
    });
    throw error;
  }
};
