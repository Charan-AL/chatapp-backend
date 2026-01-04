import * as authService from './authService.js';
import * as authService from './authService.js';
import * as otpService from '../otp/otpService.js';
import logger from '../../utils/logger.js';

/**
 * POST /api/auth/register
 * Register a new user and send OTP
 */
export const registerController = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    const result = await authService.register(email, phone, password);

    res.status(201).json(result);
  } catch (error) {
    logger.error('Registration controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * POST /api/auth/register/verify-otp
 * Verify registration OTP and create user account
 */
export const verifyRegistrationOtpController = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const result = await authService.verifyRegistrationOtp(email, otp);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Register OTP verification controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login user - send OTP to email
 */
export const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Login controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * POST /api/auth/login/verify-otp
 * Verify login OTP and issue JWT token
 */
export const verifyLoginOtpController = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const result = await authService.verifyLoginOtp(email, otp);

    res.status(200).json(result);
  } catch (error) {
    logger.error('Login OTP verification controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * POST /api/auth/resend-otp
 * Resend OTP to user email
 */
export const resendOtpController = async (req, res, next) => {
  try {
    const { email, purpose } = req.body;

    const result = await authService.resendOtp(email, purpose || 'login');

    res.status(200).json(result);
  } catch (error) {
    logger.error('Resend OTP controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * GET /api/auth/otp-status
 * Get current OTP session status (for timers and UI)
 */
export const getOtpStatusController = async (req, res, next) => {
  try {
    const { email, purpose } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const sessionDetails = await otpService.getOtpSessionDetails(email, purpose || 'login');

    if (!sessionDetails) {
      return res.status(404).json({
        success: false,
        message: 'No active OTP session found',
      });
    }

    res.status(200).json({
      success: true,
      data: sessionDetails,
    });
  } catch (error) {
    logger.error('Get OTP status controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * POST /api/auth/verify
 * Verify JWT token (optional endpoint for frontend to validate token)
 */
export const verifyTokenController = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);
    const decoded = authService.verifyJwt(token);

    res.status(200).json({
      success: true,
      user: decoded,
    });
  } catch (error) {
    logger.error('Token verification controller error', {
      error: error.message,
    });
    next(error);
  }
};
