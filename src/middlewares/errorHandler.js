import logger from '../utils/logger.js';

/**
 * Error handling middleware
 * Catches errors from routes and services and returns standardized responses
 */
export const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Request error', {
    message: err.message,
    path: req.path,
    method: req.method,
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let errorType = 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.message.includes('Invalid email or password')) {
    statusCode = 401;
    message = 'Invalid email or password';
    errorType = 'AUTH_ERROR';
  } else if (err.message.includes('Invalid OTP')) {
    statusCode = 400;
    message = err.message;
    errorType = 'OTP_ERROR';
  } else if (err.message.includes('OTP has expired')) {
    statusCode = 400;
    message = 'OTP has expired. Please request a new one.';
    errorType = 'OTP_EXPIRED';
  } else if (err.message.includes('No active OTP session found')) {
    statusCode = 404;
    message = 'No active OTP session. Please login or register first.';
    errorType = 'OTP_NOT_FOUND';
  } else if (err.message.includes('already exists')) {
    statusCode = 409;
    message = err.message;
    errorType = 'CONFLICT';
  } else if (err.message.includes('Too many attempts')) {
    statusCode = 429;
    message = err.message;
    errorType = 'RATE_LIMITED';
  } else if (err.message.includes('Missing required environment variables')) {
    statusCode = 500;
    message = 'Server configuration error';
    errorType = 'CONFIG_ERROR';
  } else if (err.message.includes('database')) {
    statusCode = 500;
    message = 'Database operation failed';
    errorType = 'DB_ERROR';
  } else if (err.message.includes('required')) {
    statusCode = 400;
    message = err.message;
    errorType = 'VALIDATION_ERROR';
  }

  res.status(statusCode).json({
    success: false,
    message,
    error_type: errorType,
    ...(process.env.NODE_ENV === 'development' && { debug: err.message }),
  });
};

/**
 * Catch-all middleware for unhandled routes
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
};

/**
 * Error wrapper for async route handlers
 * Prevents unhandled promise rejections
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
