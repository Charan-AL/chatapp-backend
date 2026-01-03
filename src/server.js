import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import appConfig from './config/app.js';
import app from './app.js';
import { testEmailConnection } from './modules/email/brevoApiService.js';
import logger from './utils/logger.js';
import { query, closePool } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run database migrations automatically
 */
const runDatabaseMigrations = async () => {
  try {
    logger.info('🔄 Running database migrations...');

    // Read the schema.sql file
    const schemaPath = path.join(__dirname, './database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      logger.warn('⚠️  Schema file not found - skipping migrations');
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by statements and execute
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    let executedCount = 0;
    for (const statement of statements) {
      try {
        await query(statement);
        executedCount++;
      } catch (error) {
        // Log but continue - some statements may fail if tables already exist (which is fine)
        logger.debug(`Migration statement result: ${error.message?.substring(0, 50)}`);
      }
    }

    logger.info(`✅ Database migrations completed (${executedCount} statements)`);
  } catch (error) {
    logger.error('❌ Failed to run migrations:', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Retry logic for database connection test
 */
const testDatabaseConnection = async (maxRetries = 3, retryDelayMs = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Testing database connection (attempt ${attempt}/${maxRetries})...`);
      const result = await query('SELECT NOW()');
      logger.info('✅ Database connected successfully');
      return result;
    } catch (error) {
      logger.warn(`Database connection attempt ${attempt} failed: ${error.message}`);

      if (attempt === maxRetries) {
        throw error; // Throw on last attempt
      }

      // Wait before retrying
      logger.info(`Retrying in ${retryDelayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }
};

/**
 * Initialize database connection and start server
 */
const startServer = async () => {
  try {
    // Validate environment variables
    logger.info('Validating environment variables...');
    appConfig.validate();
    logger.info('✅ Environment variables validated');

    // Test database connection with retries
    await testDatabaseConnection(3, 2000);

    // Run database migrations automatically
    await runDatabaseMigrations();

    // Test email service (non-blocking)
    logger.info('Testing email service...');
    try {
      await testEmailConnection();
      logger.info('✅ Email service connected');
    } catch (emailError) {
      logger.warn('⚠️  Email service connection failed - server will continue but emails may not work', {
        error: emailError.message,
        hint: 'Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD environment variables',
        recommendation: 'For Brevo: Use host=smtp-relay.brevo.com, port=587, user=your-brevo-email@example.com, pass=your-smtp-password',
      });
    }

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
