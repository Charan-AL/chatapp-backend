import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter (10 requests per minute per IP)
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for GET requests
    return req.method === 'GET';
  },
});

/**
 * Authentication endpoints rate limiter (5 requests per minute per IP)
 * For registration, login endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP and email if provided
    return req.body?.email || req.ip;
  },
});

/**
 * OTP endpoint rate limiter (3 requests per 5 minutes per IP)
 * For OTP verification and resend endpoints
 */
export const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  message: 'Too many OTP requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP and email if provided
    return req.body?.email || req.ip;
  },
});

/**
 * Strict rate limiter for sensitive endpoints (1 request per minute per IP)
 */
export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  apiLimiter,
  authLimiter,
  otpLimiter,
  strictLimiter,
};
