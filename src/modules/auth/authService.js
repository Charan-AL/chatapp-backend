import { query, getOne } from '../../config/database.js';
import { hashPassword, comparePassword } from '../../utils/hash.js';
import { calculateExpiry } from '../../utils/crypto.js';
import jwt from 'jsonwebtoken';
import appConfig from '../../config/app.js';
import logger from '../../utils/logger.js';
import * as otpService from '../otp/otpService.js';
import * as userService from '../users/userService.js';
import * as emailService from '../email/brevoApiService.js';

/**
 * Register a new user (Step 1: Create pending registration and send OTP)
 * @param {string} email - User email
 * @param {string} phone - User phone number
 * @param {string} password - Plain text password
 * @returns {Promise<object>} Registration details with OTP expiry
 */
export const register = async (email, phone, password) => {
  if (!email || !phone || !password) {
    throw new Error('Email, phone, and password are required');
  }

  // Basic validation
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  if (!/^\d{10}$/.test(phone)) {
    throw new Error('Phone number must be 10 digits');
  }

  try {
    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check for existing pending registration
    const existingPending = await getOne(
      `SELECT id FROM pending_registrations WHERE email = $1`,
      [email]
    );

    if (existingPending) {
      // Delete old pending registration
      await query(
        `DELETE FROM pending_registrations WHERE email = $1`,
        [email]
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create pending registration
    const expiryTimestamp = calculateExpiry(appConfig.otp.expiryMinutes);

    const result = await query(
      `INSERT INTO pending_registrations (email, phone, password_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, expires_at`,
      [email, phone, hashedPassword, expiryTimestamp]
    );

    const pendingReg = result.rows[0];

    // Create OTP session
    const { otp, session } = await otpService.createOtpSession(email, 'registration');

    // Send OTP email
    await emailService.sendOtpEmail(email, otp);

    logger.info('User registration started', {
      email,
      pendingRegId: pendingReg.id,
    });

    return {
      success: true,
      message: 'Registration initiated. Please verify your email with the OTP sent.',
      email,
      otp_expires_at: session.expiresAt,
      otp_expires_in_seconds: session.expiresInSeconds,
    };
  } catch (error) {
    logger.error('Registration failed', {
      email,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Verify registration OTP and create user account
 * @param {string} email - User email
 * @param {string} otp - Plain text OTP from user
 * @returns {Promise<object>} Created user and JWT token
 */
export const verifyRegistrationOtp = async (email, otp) => {
  if (!email || !otp) {
    throw new Error('Email and OTP are required');
  }

  try {
    // Verify OTP
    await otpService.verifyOtp(email, otp, 'registration');

    // Get pending registration details
    const pendingReg = await getOne(
      `SELECT email, phone, password_hash FROM pending_registrations WHERE email = $1`,
      [email]
    );

    if (!pendingReg) {
      throw new Error('No pending registration found');
    }

    // Create user account
    const user = await query(
      `INSERT INTO users (email, phone, password_hash, is_email_verified)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, phone, is_email_verified, created_at`,
      [email, pendingReg.phone, pendingReg.password_hash, true]
    );

    const createdUser = user.rows[0];

    // Delete pending registration
    await query(
      `DELETE FROM pending_registrations WHERE email = $1`,
      [email]
    );

    // Delete OTP session
    await otpService.deleteOtpSession(email, 'registration');

    // Generate JWT
    const token = generateJwt({
      userId: createdUser.id,
      email: createdUser.email,
    });

    logger.info('User registered and verified successfully', {
      userId: createdUser.id,
      email: createdUser.email,
    });

    return {
      success: true,
      message: 'Registration completed successfully',
      user: {
        id: createdUser.id,
        email: createdUser.email,
        phone: createdUser.phone,
        is_email_verified: createdUser.is_email_verified,
      },
      token,
    };
  } catch (error) {
    logger.error('Registration OTP verification failed', {
      email,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Login - Send OTP to user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} Login OTP session details
 */
export const login = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    // Get user with password hash
    const user = await userService.getUserWithPassword(email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('This account has been deactivated');
    }

    // Create OTP session
    const { otp, session } = await otpService.createOtpSession(email, 'login');

    // Send OTP email
    await emailService.sendOtpEmail(email, otp);

    logger.info('Login OTP sent', {
      userId: user.id,
      email,
    });

    return {
      success: true,
      message: 'OTP sent to your email. Please verify to login.',
      email,
      user_id: user.id,
      otp_expires_at: session.expiresAt,
      otp_expires_in_seconds: session.expiresInSeconds,
    };
  } catch (error) {
    logger.error('Login failed', {
      email,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Verify login OTP and issue JWT
 * @param {string} email - User email
 * @param {string} otp - Plain text OTP from user
 * @returns {Promise<object>} User and JWT token
 */
export const verifyLoginOtp = async (email, otp) => {
  if (!email || !otp) {
    throw new Error('Email and OTP are required');
  }

  try {
    // Verify OTP
    await otpService.verifyOtp(email, otp, 'login');

    // Get user details
    const user = await userService.getUserByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    // Update last login
    await userService.updateLastLogin(user.id);

    // Delete OTP session
    await otpService.deleteOtpSession(email, 'login');

    // Generate JWT
    const token = generateJwt({
      userId: user.id,
      email: user.email,
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email,
    });

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        is_email_verified: user.is_email_verified,
      },
      token,
    };
  } catch (error) {
    logger.error('Login OTP verification failed', {
      email,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Resend OTP to user
 * @param {string} email - User email
 * @param {string} purpose - 'login' or 'registration'
 * @returns {Promise<object>} OTP session details
 */
export const resendOtp = async (email, purpose = 'login') => {
  if (!email || !['login', 'registration'].includes(purpose)) {
    throw new Error('Invalid email or purpose');
  }

  try {
    // Get current OTP session
    const sessionDetails = await otpService.getOtpSessionDetails(email, purpose);

    if (!sessionDetails) {
      throw new Error(`No active ${purpose} session found`);
    }

    // Check if user is blocked
    if (sessionDetails.isBlocked) {
      throw new Error(
        `Too many attempts. Please try again after ${Math.ceil(sessionDetails.blockedUntilSeconds / 60)} minutes`
      );
    }

    // Check if previous OTP has not expired (user must wait or use current one)
    if (!sessionDetails.hasExpired) {
      throw new Error('Please wait before requesting a new OTP');
    }

    // Create new OTP session
    const { otp, session } = await otpService.createOtpSession(email, purpose);

    // Send OTP email
    await emailService.sendOtpEmail(email, otp);

    logger.info('OTP resent', {
      email,
      purpose,
    });

    return {
      success: true,
      message: 'New OTP sent to your email',
      email,
      otp_expires_at: session.expiresAt,
      otp_expires_in_seconds: session.expiresInSeconds,
    };
  } catch (error) {
    logger.error('OTP resend failed', {
      email,
      purpose,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Generate JWT token
 * @param {object} payload - JWT payload
 * @returns {string} JWT token
 */
export const generateJwt = (payload) => {
  try {
    const token = jwt.sign(payload, appConfig.jwt.secret, {
      expiresIn: appConfig.jwt.expiry,
      algorithm: 'HS256',
    });

    return token;
  } catch (error) {
    logger.error('JWT generation failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 */
export const verifyJwt = (token) => {
  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret, {
      algorithms: ['HS256'],
    });

    return decoded;
  } catch (error) {
    logger.error('JWT verification failed', {
      error: error.message,
    });
    throw error;
  }
};
