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
 * Trust Proxy Configuration
 * Required for Railway and other reverse proxy environments
 * This allows Express to read X-Forwarded-For headers for proper IP detection
 */
app.set('trust proxy', 1);

/**
 * Security Middleware
 */
app.use(helmet());

/**
 * CORS Configuration
 */
const corsOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',           // Local development
      'http://localhost:8080',           // Mobile development
      'https://chatapp-backend-production-bd9e.up.railway.app', // Railway production domain
      'https://*.railway.app',           // All Railway subdomains
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl requests)
      if (!origin) return callback(null, true);

      // Check if origin matches any allowed origin
      const isAllowed = corsOrigins.some(allowed => {
        if (allowed.includes('*')) {
          // Handle wildcard domains
          const pattern = allowed.replace('*.', '').replace(/\*/g, '.*');
          return new RegExp(`^https?://(.*\\.)?${pattern}$`).test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    headers: {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      origin: req.headers['origin'] || 'none',
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body).substring(0, 100) : 'N/A',
  });

  // Log response when it's finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
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
