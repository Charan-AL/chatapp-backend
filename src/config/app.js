import dotenv from 'dotenv';

dotenv.config();

/**
 * Validate required environment variables
 */
const validateEnv = () => {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM_EMAIL',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

/**
 * Application configuration object
 */
const appConfig = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'ChatApp',
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || '7d',
  },

  // OTP Configuration (from environment variables)
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '15', 10),
    resendCooldownMinutes: parseInt(process.env.OTP_RESEND_COOLDOWN_MINUTES || '5', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  },

  // Email (Brevo SMTP)
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    fromEmail: process.env.SMTP_FROM_EMAIL,
    fromName: process.env.SMTP_FROM_NAME || 'ChatApp',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Validation
  validate: validateEnv,

  // Check if production
  isProduction: () => appConfig.env === 'production',
  isDevelopment: () => appConfig.env === 'development',
};

export default appConfig;
