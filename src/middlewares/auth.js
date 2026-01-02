import * as authService from '../modules/auth/authService.js';
import logger from '../utils/logger.js';

/**
 * Middleware to verify JWT token
 * Attaches user data to req.user if token is valid
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = authService.verifyJwt(token);
      req.user = decoded;
      next();
    } catch (error) {
      logger.warn('Invalid token', {
        error: error.message,
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Token verification middleware error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * Middleware to require authentication
 * Can be applied to routes that require a valid JWT
 */
export const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }
  next();
};

/**
 * Middleware to attach optional user data if token is provided
 * Does not fail if token is invalid or missing
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = authService.verifyJwt(token);
        req.user = decoded;
      } catch (error) {
        // Silently fail - token is optional
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error', {
      error: error.message,
    });
    next(error);
  }
};
