import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import appConfig from './config/app.js';
import app from './app.js';
import logger from './utils/logger.js';
import { query, closePool, testConnection, getPoolStatus } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run database migrations automatically
 * This is non-blocking and won't prevent the server from starting
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
    // Don't throw - migrations are non-blocking
  }
};

/**
 * Test database connection with exponential backoff retry
 * Returns diagnostic info to help users identify issues
 */
const testDatabaseConnection = async (maxRetries = 3, initialDelayMs = 2000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Testing database connection (attempt ${attempt}/${maxRetries})...`);

      // Use the enhanced testConnection function
      const testResult = await testConnection();

      if (testResult.connected) {
        logger.info('✅ Database connected successfully', testResult.diagnostics);
        return true;
      }

      // Connection test returned failure info
      logger.warn(`Database connection test failed: ${testResult.message}`, {
        diagnostics: testResult.diagnostics,
      });

      if (attempt === maxRetries) {
        // On last attempt, log the diagnostic hint
        logger.error('❌ Max database connection retries reached', {
          message: testResult.message,
          diagnostics: testResult.diagnostics,
          hint: testResult.diagnostics.hint,
        });
        return false;
      }

      const delayMs = initialDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
      logger.info(`Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      logger.warn(`Database connection attempt ${attempt} failed: ${error.message}`);

      if (attempt === maxRetries) {
        logger.error('❌ Max database connection retries reached', {
          error: error.message,
          hint: 'Verify DATABASE_URL environment variable is set correctly and PostgreSQL service is running',
        });
        return false;
      }

      const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
      logger.info(`Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return false;
};

/**
 * Main server startup
 */
const startServer = async () => {
  try {
    const PORT = appConfig.port;

    // Start Express server IMMEDIATELY
    // Critical: The /health endpoint must be available right away for Railway healthchecks
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📧 Environment: ${appConfig.env}`);
      logger.info(`🔐 OTP Expiry: ${appConfig.otp.expiryMinutes} minutes`);
      logger.info(`⏱️  Resend Cooldown: ${appConfig.otp.resendCooldownMinutes} minutes`);
      logger.info(`🛡️  Max OTP Attempts: ${appConfig.otp.maxAttempts}`);
      logger.info(`✅ Health endpoint available at /health`);

      // Log to console as well for Railway dashboard
      console.log(`\n✅ Server started successfully on port ${PORT}`);
      console.log(`✅ Health endpoint: GET /health\n`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('❌ Server error', { error: error.message });
        process.exit(1);
      }
    });

    // ============================================
    // Non-blocking initialization (happens in background)
    // ============================================

    // 1. Validate environment variables (non-blocking)
    (async () => {
      try {
        logger.info('Validating environment variables...');
        appConfig.validate();
        logger.info('✅ Environment variables validated');
      } catch (error) {
        logger.error('⚠️  Environment validation failed', {
          error: error.message,
          hint: 'Check DATABASE_URL and JWT_SECRET are set',
        });
        // Still continue - some features will work without full config
      }
    })();

    // 2. Test and initialize database (non-blocking)
    (async () => {
      try {
        logger.info('Attempting database connection...');

        // Test connection with diagnostics
        const connected = await testDatabaseConnection(3, 2000);

        if (connected) {
          logger.info('Database connection successful, running migrations...');
          await runDatabaseMigrations();
          logger.info('✅ Database initialization complete');

          // Log pool status
          const poolStatus = getPoolStatus();
          logger.info('Database pool status:', poolStatus);
        } else {
          // Connection failed - provide clear guidance
          logger.error('⚠️  Database connection failed', {
            message: 'App will continue without database functionality',
            action: 'Check the DATABASE_URL environment variable and ensure PostgreSQL is running and accessible',
            troubleshooting: [
              '1. Verify DATABASE_URL is set in Railway environment variables',
              '2. Check PostgreSQL service is running and healthy in Railway dashboard',
              '3. Verify the connection string format: postgresql://user:password@host:5432/dbname',
              '4. Check Railway network connectivity between services',
            ],
          });

          // Still log pool status for debugging
          const poolStatus = getPoolStatus();
          logger.debug('Database pool status:', poolStatus);
        }
      } catch (error) {
        logger.error('❌ Database initialization error', {
          error: error.message,
          hint: 'Check DATABASE_URL and ensure PostgreSQL is accessible',
        });
      }
    })();

    // 3. Test email service (non-blocking)
    (async () => {
      try {
        // Import here to avoid circular dependencies
        const emailService = await import('./modules/email/brevoApiService.js');
        logger.info('Testing email service...');
        await emailService.testEmailConnection();
        logger.info('✅ Email service connected');
      } catch (error) {
        logger.warn('⚠️  Email service connection failed', {
          error: error.message,
          hint: 'Check SMTP_* environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)',
          action: 'App will continue but OTP emails will not be sent',
        });
      }
    })();

  } catch (error) {
    logger.error('❌ Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Add a diagnostic endpoint for debugging (logs only, no actual endpoint)
const logSystemInfo = () => {
  logger.info('System Information:', {
    nodeVersion: process.version,
    platform: process.platform,
    environment: process.env.NODE_ENV,
    databaseUrlSet: !!process.env.DATABASE_URL,
    jwtSecretSet: !!process.env.JWT_SECRET,
  });
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received - shutting down gracefully');
  closePool().then(() => process.exit(0)).catch(err => {
    logger.error('Error closing database pool', { error: err.message });
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received - shutting down gracefully');
  closePool().then(() => process.exit(0)).catch(err => {
    logger.error('Error closing database pool', { error: err.message });
    process.exit(1);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('❌ Unhandled Rejection', {
    reason: String(reason),
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Log system info on startup
logSystemInfo();

// Start the server
startServer();
