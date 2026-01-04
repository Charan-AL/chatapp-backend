import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create a connection pool for production-grade database management
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // Increased from 2s to 15s for Railway stability
  statement_timeout: 30000, // Statement timeout: 30 seconds
  application_name: 'chat-app-backend',
});

// Log connection events
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('Database connected');
});

/**
 * Execute a SQL query
 * @param {string} query - SQL query string
 * @param {array} params - Query parameters
 * @returns {Promise<any>} Query result
 */
export const query = async (queryText, params = []) => {
  try {
    const result = await pool.query(queryText, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

/**
 * Get a single row from query result
 * @param {string} query - SQL query string
 * @param {array} params - Query parameters
 * @returns {Promise<any>} Single row or null
 */
export const getOne = async (queryText, params = []) => {
  const result = await query(queryText, params);
  return result.rows[0] || null;
};

/**
 * Get multiple rows from query result
 * @param {string} query - SQL query string
 * @param {array} params - Query parameters
 * @returns {Promise<array>} Array of rows
 */
export const getMany = async (queryText, params = []) => {
  const result = await query(queryText, params);
  return result.rows;
};

/**
 * Close the database connection pool
 * @returns {Promise<void>}
 */
export const closePool = async () => {
  await pool.end();
};

export default pool;
