import { query, getOne } from '../../config/database.js';
import * as cryptoService from './cryptoService.js';
import logger from '../../utils/logger.js';

/**
 * Create or update identity key for a user
 * @param {string} userId - User ID
 * @param {string} publicKeyHex - X25519 public key in hex format
 * @returns {Promise<object>} Created/updated identity key record
 */
export const createOrUpdateIdentityKey = async (userId, publicKeyHex) => {
  if (!userId || !publicKeyHex) {
    throw new Error('User ID and public key are required');
  }

  if (!cryptoService.validateX25519PublicKey(publicKeyHex)) {
    throw new Error('Invalid X25519 public key format');
  }

  try {
    const result = await query(
      `INSERT INTO identity_keys (user_id, public_key_hex, key_algorithm)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
       SET public_key_hex = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING id, user_id, public_key_hex, key_algorithm, created_at, updated_at`,
      [userId, publicKeyHex, 'X25519']
    );

    const identityKey = result.rows[0];

    logger.info('Identity key created/updated', {
      userId,
      identityKeyId: identityKey.id,
    });

    return identityKey;
  } catch (error) {
    logger.error('Identity key creation failed', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get identity key by user ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Identity key record or null
 */
export const getIdentityKeyByUserId = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const identityKey = await getOne(
      `SELECT id, user_id, public_key_hex, key_algorithm, created_at, updated_at
       FROM identity_keys
       WHERE user_id = $1`,
      [userId]
    );

    return identityKey;
  } catch (error) {
    logger.error('Identity key retrieval failed', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get identity keys for multiple users
 * @param {array} userIds - Array of user IDs
 * @returns {Promise<array>} Array of identity key records
 */
export const getIdentityKeysByUserIds = async (userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error('User IDs array is required');
  }

  try {
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(
      `SELECT id, user_id, public_key_hex, key_algorithm, created_at, updated_at
       FROM identity_keys
       WHERE user_id = ANY($1::uuid[])`,
      [userIds]
    );

    return result.rows;
  } catch (error) {
    logger.error('Identity keys batch retrieval failed', {
      userCount: userIds.length,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Delete identity key for a user
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether key was deleted
 */
export const deleteIdentityKey = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const result = await query(
      `DELETE FROM identity_keys WHERE user_id = $1`,
      [userId]
    );

    const deleted = result.rowCount > 0;

    logger.info('Identity key deleted', {
      userId,
      deleted,
    });

    return deleted;
  } catch (error) {
    logger.error('Identity key deletion failed', {
      userId,
      error: error.message,
    });
    throw error;
  }
};
