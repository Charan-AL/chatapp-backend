import { query, getOne, getMany } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Store encrypted message in database
 * @param {string} chatSessionId - Chat session ID
 * @param {string} senderId - Sender user ID
 * @param {string} ciphertext - Encrypted message content
 * @param {string} ivHex - Initialization vector in hex
 * @param {string} tagHex - Authentication tag in hex
 * @param {string} senderPublicKeyHex - Sender's public key at time of sending
 * @returns {Promise<object>} Stored message record
 */
export const storeEncryptedMessage = async (
  chatSessionId,
  senderId,
  ciphertext,
  ivHex,
  tagHex,
  senderPublicKeyHex
) => {
  if (!chatSessionId || !senderId || !ciphertext || !ivHex || !tagHex) {
    throw new Error('All message fields are required');
  }

  try {
    const result = await query(
      `INSERT INTO messages 
       (chat_session_id, sender_id, ciphertext, iv_hex, tag_hex, sender_public_key_hex, created_at, is_delivered)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, true)
       RETURNING id, chat_session_id, sender_id, ciphertext, iv_hex, tag_hex, sender_public_key_hex, created_at, is_delivered, is_read`,
      [chatSessionId, senderId, ciphertext, ivHex, tagHex, senderPublicKeyHex]
    );

    const message = result.rows[0];

    logger.info('Encrypted message stored', {
      messageId: message.id,
      chatSessionId,
      senderId,
    });

    return message;
  } catch (error) {
    logger.error('Message storage failed', {
      chatSessionId,
      senderId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get messages from a chat session
 * @param {string} chatSessionId - Chat session ID
 * @param {number} limit - Max number of messages to return
 * @param {number} offset - Offset for pagination
 * @returns {Promise<array>} Array of message records
 */
export const getMessagesByChatSession = async (chatSessionId, limit = 50, offset = 0) => {
  if (!chatSessionId) {
    throw new Error('Chat session ID is required');
  }

  try {
    const result = await query(
      `SELECT 
        id, 
        chat_session_id, 
        sender_id, 
        ciphertext, 
        iv_hex, 
        tag_hex, 
        sender_public_key_hex, 
        created_at, 
        is_delivered, 
        is_read
       FROM messages
       WHERE chat_session_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [chatSessionId, limit, offset]
    );

    return result.rows;
  } catch (error) {
    logger.error('Messages retrieval failed', {
      chatSessionId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get undelivered messages for a user
 * @param {string} userId - User ID (recipient)
 * @returns {Promise<array>} Array of undelivered message records
 */
export const getUndeliveredMessages = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const result = await query(
      `SELECT 
        m.id, 
        m.chat_session_id, 
        m.sender_id, 
        m.ciphertext, 
        m.iv_hex, 
        m.tag_hex, 
        m.sender_public_key_hex, 
        m.created_at, 
        m.is_delivered, 
        m.is_read,
        cs.user_a_id,
        cs.user_b_id
       FROM messages m
       JOIN chat_sessions cs ON m.chat_session_id = cs.id
       WHERE (cs.user_a_id = $1 OR cs.user_b_id = $1)
       AND m.sender_id != $1
       AND m.is_delivered = false
       ORDER BY m.created_at ASC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Undelivered messages retrieval failed', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Mark message as delivered
 * @param {string} messageId - Message ID
 * @returns {Promise<boolean>} Whether update was successful
 */
export const markMessageAsDelivered = async (messageId) => {
  if (!messageId) {
    throw new Error('Message ID is required');
  }

  try {
    const result = await query(
      `UPDATE messages 
       SET is_delivered = true
       WHERE id = $1`,
      [messageId]
    );

    return result.rowCount > 0;
  } catch (error) {
    logger.error('Mark message as delivered failed', {
      messageId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Mark message as read
 * @param {string} messageId - Message ID
 * @returns {Promise<boolean>} Whether update was successful
 */
export const markMessageAsRead = async (messageId) => {
  if (!messageId) {
    throw new Error('Message ID is required');
  }

  try {
    const result = await query(
      `UPDATE messages 
       SET is_read = true
       WHERE id = $1`,
      [messageId]
    );

    return result.rowCount > 0;
  } catch (error) {
    logger.error('Mark message as read failed', {
      messageId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Delete message (soft delete - not implemented here, can be added later)
 * @param {string} messageId - Message ID
 * @returns {Promise<boolean>} Whether deletion was successful
 */
export const deleteMessage = async (messageId) => {
  if (!messageId) {
    throw new Error('Message ID is required');
  }

  try {
    const result = await query(
      `DELETE FROM messages WHERE id = $1`,
      [messageId]
    );

    return result.rowCount > 0;
  } catch (error) {
    logger.error('Message deletion failed', {
      messageId,
      error: error.message,
    });
    throw error;
  }
};
