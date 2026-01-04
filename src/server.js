import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import appConfig from './config/app.js';
import app from './app.js';
import logger from './utils/logger.js';
import { query, closePool } from './config/database.js';

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
 */
const testDatabaseConnection = async (maxRetries = 5, initialDelayMs = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Testing database connection (attempt ${attempt}/${maxRetries})...`);
      const result = await query('SELECT NOW()');
      logger.info('✅ Database connected successfully');
      return result;
    } catch (error) {
      const delayMs = initialDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn(`Database connection attempt ${attempt} failed: ${error.message}`);

      if (attempt === maxRetries) {
        logger.error('❌ Max database connection retries reached');
        return null; // Don't throw - continue without database
      }

      // Wait before retrying
      logger.info(`Retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
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
      logger.info(`✅ Health endpoint available at /${appConfig.env === 'production' ? '' : ''}health`);
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
      }
    })();

    // 2. Test and initialize database (non-blocking)
    (async () => {
      try {
        logger.info('Attempting database connection...');
        const connected = await testDatabaseConnection(5, 1000);

        if (connected) {
          logger.info('Running database migrations...');
          await runDatabaseMigrations();
          logger.info('✅ Database initialization complete');
        } else {
          logger.warn('⚠️  Database is not available - app will continue without it');
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
          hint: 'Check SMTP credentials in environment variables',
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

// Start the server
startServer();
