import appConfig from './config/app.js';
import app from './app.js';
import { testEmailConnection } from './modules/email/emailService.js';
import logger from './utils/logger.js';
import { query } from './config/database.js';

/**
 * Initialize database connection and start server
 */
const startServer = async () => {
  try {
    // Validate environment variables
    logger.info('Validating environment variables...');
    appConfig.validate();
    logger.info('✅ Environment variables validated');

    // Test database connection
    logger.info('Testing database connection...');
    const result = await query('SELECT NOW()');
    logger.info('✅ Database connected');

    // Test email service
    logger.info('Testing email service...');
    await testEmailConnection();
    logger.info('✅ Email service connected');

    // Start Express server
    const PORT = appConfig.port;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📧 Environment: ${appConfig.env}`);
      logger.info(`🔐 OTP Expiry: ${appConfig.otp.expiryMinutes} minutes`);
      logger.info(`⏱️  Resend Cooldown: ${appConfig.otp.resendCooldownMinutes} minutes`);
      logger.info(`🛡️  Max OTP Attempts: ${appConfig.otp.maxAttempts}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error', {
          error: error.message,
        });
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Start server
startServer();
