import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import appConfig from './config/app.js';
import logger from './utils/logger.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { apiLimiter, authLimiter, otpLimiter } from './middlewares/rateLimiter.js';

const app = express();

/**
 * Security Middleware
 */
app.use(helmet());

/**
 * CORS Configuration
 */
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })
);

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

/**
 * Request Logging Middleware
 */
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: appConfig.env,
  });
});

/**
 * API Routes
 */

// Auth routes with rate limiting
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/resend-otp', otpLimiter);
app.use('/api/auth/login/verify-otp', otpLimiter);
app.use('/api/auth/register/verify-otp', otpLimiter);

// General rate limiter for all other routes
app.use('/api', apiLimiter);

// Auth routes
app.use('/api/auth', authRoutes);

/**
 * Error Handling Middleware
 * Must be last!
 */
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Graceful Shutdown Handler
 */
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

/**
 * Unhandled Rejection Handler
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: String(reason),
    promise: String(promise),
  });
});

/**
 * Uncaught Exception Handler
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

export default app;
