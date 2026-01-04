import { query, getOne, getMany } from '../../config/database.js';
import { hashPassword } from '../../utils/hash.js';
import logger from '../../utils/logger.js';

/**
 * Create a new user account (after OTP verification)
 * @param {string} email - User email
 * @param {string} phone - User phone number
 * @param {string} password - Plain text password
 * @returns {Promise<object>} Created user object
 */
export const createUser = async (email, phone, password) => {
  if (!email || !phone || !password) {
    throw new Error('Email, phone, and password are required');
  }

  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await query(
      `INSERT INTO users (email, phone, password_hash, is_email_verified)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, phone, is_email_verified, created_at, is_active`,
      [email, phone, hashedPassword, true]
    );

    const user = result.rows[0];

    logger.info('User created successfully', {
      userId: user.id,
      email: user.email,
    });

    return user;
  } catch (error) {
    logger.error('Failed to create user', {
      email,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<object|null>} User object or null
 */
export const getUserByEmail = async (email) => {
  if (!email) {
    throw new Error('Email is required');
  }

  try {
    const user = await getOne(
      `SELECT id, email, phone, password_hash, is_email_verified, created_at, last_login_at, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    return user || null;
  } catch (error) {
    logger.error('Failed to get user by email', {
      email,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} User object or null
 */
export const getUserById = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const user = await getOne(
      `SELECT id, email, phone, is_email_verified, created_at, last_login_at, is_active
       FROM users
       WHERE id = $1`,
      [userId]
    );

    return user || null;
  } catch (error) {
    logger.error('Failed to get user by ID', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get user with password hash (for login verification)
 * @param {string} email - User email
 * @returns {Promise<object|null>} User object with password hash or null
 */
export const getUserWithPassword = async (email) => {
  if (!email) {
    throw new Error('Email is required');
  }

  try {
    const user = await getOne(
      `SELECT id, email, phone, password_hash, is_email_verified, created_at, last_login_at, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    return user || null;
  } catch (error) {
    logger.error('Failed to get user with password', {
      email,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Update user's last login timestamp
 * @param {string} userId - User ID
 * @returns {Promise<object>} Updated user object
 */
export const updateLastLogin = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const result = await query(
      `UPDATE users
       SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, phone, is_email_verified, created_at, last_login_at, is_active`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    logger.info('User last login updated', {
      userId,
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to update user last login', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Check if user exists by email
 * @param {string} email - User email
 * @returns {Promise<boolean>} True if user exists
 */
export const userExists = async (email) => {
  if (!email) {
    throw new Error('Email is required');
  }

  try {
    const result = await query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Failed to check user existence', {
      email,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Deactivate a user account
 * @param {string} userId - User ID
 * @returns {Promise<object>} Updated user object
 */
export const deactivateUser = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const result = await query(
      `UPDATE users
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, is_active`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    logger.info('User deactivated', {
      userId,
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to deactivate user', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Search for users by email or phone
 * @param {string} searchQuery - Search query (email prefix or phone number)
 * @param {string} excludeUserId - Exclude current user from results
 * @param {number} limit - Max results to return
 * @returns {Promise<array>} Array of matching users
 */
export const searchUsersByEmail = async (searchQuery, excludeUserId, limit = 10) => {
  if (!searchQuery || searchQuery.trim().length < 3) {
    throw new Error('Search query must be at least 3 characters');
  }

  try {
    // Search by email prefix OR exact phone match
    const result = await query(
      `SELECT id, email, phone, is_email_verified, created_at
       FROM users
       WHERE (email ILIKE $1 OR phone = $2)
       AND is_active = true
       AND id != $3
       ORDER BY email ASC
       LIMIT $4`,
      [`${searchQuery}%`, searchQuery, excludeUserId, limit]
    );

    return result.rows;
  } catch (error) {
    logger.error('Failed to search users', {
      searchQuery,
      error: error.message,
    });
    throw error;
  }
};
