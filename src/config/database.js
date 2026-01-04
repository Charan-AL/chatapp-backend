import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn('⚠️  WARNING: DATABASE_URL environment variable is not set!');
  console.warn('Set DATABASE_URL to your PostgreSQL connection string:');
  console.warn('  Example: postgresql://user:password@host:5432/dbname');
}

// Parse DATABASE_URL to validate format
const validateDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return {
      valid: false,
      error: 'DATABASE_URL not set',
      hint: 'Set DATABASE_URL environment variable to your PostgreSQL connection string',
    };
  }

  // Basic URL validation
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    return {
      valid: false,
      error: 'Invalid DATABASE_URL format',
      hint: 'Must start with postgresql:// or postgres://',
    };
  }

  try {
    // Try to parse the URL to catch obvious issues
    new URL(url.replace('postgresql://', 'https://').replace('postgres://', 'https://'));
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid DATABASE_URL format',
      hint: 'Expected format: postgresql://user:password@host:5432/dbname',
    };
  }
};

const dbValidation = validateDatabaseUrl();
if (!dbValidation.valid) {
  console.error(`❌ Database URL validation failed: ${dbValidation.error}`);
  console.error(`   Hint: ${dbValidation.hint}`);
}

// Create a connection pool for production-grade database management
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings optimized for Railway
  max: 5, // Reduced to avoid connection limit issues
  min: 1, // Maintain 1 idle connection
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 20000, // Increased from 10s to 20s for slow starts
  statement_timeout: 30000, // Statement timeout: 30 seconds
  application_name: 'chat-app-backend',
  // Connection string timeout (TCP timeout before connection attempt fails)
  query_timeout: 30000,
});

// Track connection state
let connectionState = {
  connected: false,
  lastError: null,
  lastErrorTime: null,
  attemptCount: 0,
};

// Handle connection errors
pool.on('error', (err) => {
  connectionState.lastError = err.message;
  connectionState.lastErrorTime = new Date();
  console.error('❌ Pool connection error:', err.message);
});

pool.on('connect', () => {
  connectionState.connected = true;
  connectionState.lastError = null;
  console.log('✅ Database connected');
});

pool.on('remove', () => {
  console.log('⚠️  Database connection removed from pool');
});

/**
 * Execute a SQL query
 * @param {string} queryText - SQL query string
 * @param {array} params - Query parameters
 * @returns {Promise<any>} Query result
 */
export const query = async (queryText, params = []) => {
  try {
    const result = await pool.query(queryText, params);
    return result;
  } catch (error) {
    // Enhanced error logging with context
    const isTimeoutError = error.message.includes('timeout') || error.message.includes('terminated');
    const isConnectionError = error.message.includes('Connection') || error.message.includes('ECONNREFUSED');
    
    if (isTimeoutError) {
      console.error('❌ Database query timeout:', {
        message: error.message,
        query: queryText.substring(0, 100),
        hint: 'Database is not responding within expected time. Check if PostgreSQL service is running.',
      });
    } else if (isConnectionError) {
      console.error('❌ Database connection error:', {
        message: error.message,
        hint: 'Cannot connect to database. Verify DATABASE_URL and network connectivity.',
      });
    } else {
      console.error('❌ Database query error:', error.message);
    }
    throw error;
  }
};

/**
 * Get a single row from query result
 * @param {string} queryText - SQL query string
 * @param {array} params - Query parameters
 * @returns {Promise<any>} Single row or null
 */
export const getOne = async (queryText, params = []) => {
  const result = await query(queryText, params);
  return result.rows[0] || null;
};

/**
 * Get multiple rows from query result
 * @param {string} queryText - SQL query string
 * @param {array} params - Query parameters
 * @returns {Promise<array>} Array of rows
 */
export const getMany = async (queryText, params = []) => {
  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Test database connection with detailed diagnostics
 * @returns {Promise<{connected: boolean, message: string, diagnostics: object}>}
 */
export const testConnection = async () => {
  try {
    const startTime = Date.now();
    const result = await pool.query('SELECT NOW() as current_time, version() as database_version');
    const duration = Date.now() - startTime;

    const dbInfo = result.rows[0];
    return {
      connected: true,
      message: 'Database connection successful',
      diagnostics: {
        responseTime: `${duration}ms`,
        currentTime: dbInfo.current_time,
        databaseVersion: dbInfo.database_version,
      },
    };
  } catch (error) {
    const isTimeoutError = error.message.includes('timeout') || error.message.includes('terminated');
    const isConnectionError = error.message.includes('Connection') || error.message.includes('ECONNREFUSED');
    const isDatabaseError = error.message.includes('does not exist') || error.message.includes('permission');

    let hint = 'Unknown error';
    if (isTimeoutError) {
      hint = '1. Verify DATABASE_URL is correct\n2. Check if PostgreSQL service is running\n3. Verify network connectivity\n4. Check Railway PostgreSQL plugin is provisioned';
    } else if (isConnectionError) {
      hint = '1. Verify DATABASE_URL is set correctly\n2. Check if PostgreSQL service is accessible\n3. Verify firewall rules allow connections\n4. Check Railway PostgreSQL is running';
    } else if (isDatabaseError) {
      hint = 'Database exists but has permission issues. Check credentials in DATABASE_URL';
    }

    return {
      connected: false,
      message: `Database connection failed: ${error.message}`,
      diagnostics: {
        errorType: isTimeoutError ? 'TIMEOUT' : isConnectionError ? 'CONNECTION_ERROR' : 'OTHER',
        databaseUrl: process.env.DATABASE_URL ? '*** SET ***' : 'NOT SET',
        hint,
      },
    };
  }
};

/**
 * Get connection pool status
 * @returns {object} Pool status information
 */
export const getPoolStatus = () => {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
    connectionState,
  };
};

/**
 * Close the database connection pool
 * @returns {Promise<void>}
 */
export const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Database connection pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
  }
};

export default pool;
