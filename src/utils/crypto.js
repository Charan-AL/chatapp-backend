import crypto from 'crypto';

/**
 * Generate a 10-digit numeric OTP
 * IMPORTANT: OTP is NOT logged or exposed in errors
 * @returns {string} 10-digit numeric OTP
 */
export const generateOtp = () => {
  const otp = crypto.randomInt(1000000000, 9999999999).toString();
  return otp;
};

/**
 * Check if a string is a valid 10-digit numeric OTP
 * @param {string} otp - OTP to validate
 * @returns {boolean} True if valid OTP format
 */
export const isValidOtpFormat = (otp) => {
  if (!otp || typeof otp !== 'string') {
    return false;
  }
  const otpRegex = /^\d{10}$/;
  return otpRegex.test(otp);
};

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} Hex-encoded random token
 */
export const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Calculate expiry timestamp based on minutes
 * @param {number} minutes - Minutes to add
 * @returns {Date} Expiry timestamp
 */
export const calculateExpiry = (minutes) => {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error('Minutes must be a positive integer');
  }

  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

/**
 * Check if a timestamp has expired
 * @param {Date|string} expiryTimestamp - Expiry timestamp
 * @returns {boolean} True if expired
 */
export const isExpired = (expiryTimestamp) => {
  if (!expiryTimestamp) {
    return true;
  }

  const expiry = new Date(expiryTimestamp);
  const now = new Date();
  return now > expiry;
};

/**
 * Get seconds remaining until expiry
 * @param {Date|string} expiryTimestamp - Expiry timestamp
 * @returns {number} Seconds remaining (0 if expired)
 */
export const getSecondsUntilExpiry = (expiryTimestamp) => {
  if (!expiryTimestamp) {
    return 0;
  }

  const expiry = new Date(expiryTimestamp);
  const now = new Date();
  const secondsRemaining = Math.floor((expiry - now) / 1000);

  return Math.max(0, secondsRemaining);
};

/**
 * Check if a user is currently blocked from resending OTP
 * @param {Date|string|null} blockedUntil - Blocked until timestamp
 * @returns {boolean} True if currently blocked
 */
export const isBlockedFromResend = (blockedUntil) => {
  if (!blockedUntil) {
    return false;
  }

  const blocked = new Date(blockedUntil);
  const now = new Date();
  return now < blocked;
};

/**
 * Get seconds remaining in the block period
 * @param {Date|string|null} blockedUntil - Blocked until timestamp
 * @returns {number} Seconds remaining in block (0 if not blocked)
 */
export const getSecondsUntilUnblock = (blockedUntil) => {
  if (!blockedUntil) {
    return 0;
  }

  const blocked = new Date(blockedUntil);
  const now = new Date();
  const secondsRemaining = Math.floor((blocked - now) / 1000);

  return Math.max(0, secondsRemaining);
};
