import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Invalid password provided');
  }

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
};

/**
 * Compare a plain text password with its hash
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if passwords match
 */
export const comparePassword = async (plainPassword, hashedPassword) => {
  if (!plainPassword || !hashedPassword) {
    throw new Error('Invalid password comparison parameters');
  }

  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
};

/**
 * Hash an OTP for secure storage
 * @param {string} otp - Plain text OTP
 * @returns {Promise<string>} Hashed OTP
 */
export const hashOtp = async (otp) => {
  if (!otp || typeof otp !== 'string') {
    throw new Error('Invalid OTP provided');
  }

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedOtp = await bcrypt.hash(otp, salt);
    return hashedOtp;
  } catch (error) {
    throw new Error(`OTP hashing failed: ${error.message}`);
  }
};

/**
 * Compare a plain text OTP with its hash
 * @param {string} plainOtp - Plain text OTP
 * @param {string} hashedOtp - Hashed OTP from database
 * @returns {Promise<boolean>} True if OTPs match
 */
export const compareOtp = async (plainOtp, hashedOtp) => {
  if (!plainOtp || !hashedOtp) {
    throw new Error('Invalid OTP comparison parameters');
  }

  try {
    const isMatch = await bcrypt.compare(plainOtp, hashedOtp);
    return isMatch;
  } catch (error) {
    throw new Error(`OTP comparison failed: ${error.message}`);
  }
};
