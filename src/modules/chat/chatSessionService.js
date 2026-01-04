import { query, getOne, getMany } from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * Create or get existing chat session between two users
 * @param {string} userAId - First user ID
 * @param {string} userBId - Second user ID
 * @returns {Promise<object>} Chat session record
 */
export const createOrGetChatSession = async (userAId, userBId) => {
  if (!userAId || !userBId) {
    throw new Error('Both user IDs are required');
  }

  if (userAId === userBId) {
    throw new Error('Cannot create chat session with yourself');
  }

  try {
    // Normalize user IDs so the pair is always sorted (for unique constraint)
    const [minId, maxId] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];

    const result = await query(
      `INSERT INTO chat_sessions (user_a_id, user_b_id, created_at, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (
         CASE WHEN user_a_id < user_b_id THEN user_a_id ELSE user_b_id END,
         CASE WHEN user_a_id < user_b_id THEN user_b_id ELSE user_a_id END
       )
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id, user_a_id, user_b_id, created_at, updated_at, is_active`,
      [minId, maxId]
    );

    const chatSession = result.rows[0];

    logger.info('Chat session created/retrieved', {
      chatSessionId: chatSession.id,
      userAId: minId,
      userBId: maxId,
    });

    return chatSession;
  } catch (error) {
    logger.error('Chat session creation failed', {
      userAId,
      userBId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get chat session by ID
 * @param {string} chatSessionId - Chat session ID
 * @returns {Promise<object>} Chat session record or null
 */
export const getChatSessionById = async (chatSessionId) => {
  if (!chatSessionId) {
    throw new Error('Chat session ID is required');
  }

  try {
    const chatSession = await getOne(
      `SELECT id, user_a_id, user_b_id, created_at, updated_at, is_active
       FROM chat_sessions
       WHERE id = $1`,
      [chatSessionId]
    );

    return chatSession;
  } catch (error) {
    logger.error('Chat session retrieval failed', {
      chatSessionId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get all chat sessions for a user
 * @param {string} userId - User ID
 * @param {boolean} activeOnly - Only return active chats
 * @returns {Promise<array>} Array of chat session records
 */
export const getUserChatSessions = async (userId, activeOnly = true) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    let sql = `SELECT 
      cs.id, 
      cs.user_a_id, 
      cs.user_b_id, 
      cs.created_at, 
      cs.updated_at, 
      cs.is_active,
      CASE 
        WHEN cs.user_a_id = $1 THEN cs.user_b_id
        ELSE cs.user_a_id
      END as other_user_id,
      CASE
        WHEN cs.user_a_id = $1 THEN u_b.email
        ELSE u_a.email
      END as other_user_email,
      CASE
        WHEN cs.user_a_id = $1 THEN u_b.id
        ELSE u_a.id
      END as other_user_id_verified
    FROM chat_sessions cs
    LEFT JOIN users u_a ON cs.user_a_id = u_a.id
    LEFT JOIN users u_b ON cs.user_b_id = u_b.id
    WHERE (cs.user_a_id = $1 OR cs.user_b_id = $1)`;

    if (activeOnly) {
      sql += ` AND cs.is_active = true`;
    }

    sql += ` ORDER BY cs.updated_at DESC`;

    const result = await query(sql, [userId]);
    return result.rows;
  } catch (error) {
    logger.error('User chat sessions retrieval failed', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get chat session between two specific users
 * @param {string} userId - Current user ID
 * @param {string} otherUserId - Other user ID
 * @returns {Promise<object>} Chat session record or null
 */
export const getChatSessionBetweenUsers = async (userId, otherUserId) => {
  if (!userId || !otherUserId) {
    throw new Error('Both user IDs are required');
  }

  if (userId === otherUserId) {
    throw new Error('Cannot get chat session with yourself');
  }

  try {
    const [minId, maxId] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];

    const chatSession = await getOne(
      `SELECT id, user_a_id, user_b_id, created_at, updated_at, is_active
       FROM chat_sessions
       WHERE (user_a_id = $1 AND user_b_id = $2) OR (user_a_id = $2 AND user_b_id = $1)`,
      [minId, maxId]
    );

    return chatSession;
  } catch (error) {
    logger.error('Chat session retrieval failed', {
      userId,
      otherUserId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Deactivate chat session
 * @param {string} chatSessionId - Chat session ID
 * @returns {Promise<boolean>} Whether deactivation was successful
 */
export const deactivateChatSession = async (chatSessionId) => {
  if (!chatSessionId) {
    throw new Error('Chat session ID is required');
  }

  try {
    const result = await query(
      `UPDATE chat_sessions 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [chatSessionId]
    );

    const deactivated = result.rowCount > 0;

    logger.info('Chat session deactivated', {
      chatSessionId,
      deactivated,
    });

    return deactivated;
  } catch (error) {
    logger.error('Chat session deactivation failed', {
      chatSessionId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Delete chat session and all its messages
 * @param {string} chatSessionId - Chat session ID
 * @returns {Promise<boolean>} Whether deletion was successful
 */
export const deleteChatSession = async (chatSessionId) => {
  if (!chatSessionId) {
    throw new Error('Chat session ID is required');
  }

  try {
    // Delete all messages in chat session
    await query(
      `DELETE FROM messages WHERE chat_session_id = $1`,
      [chatSessionId]
    );

    // Delete chat session
    const result = await query(
      `DELETE FROM chat_sessions WHERE id = $1`,
      [chatSessionId]
    );

    const deleted = result.rowCount > 0;

    logger.info('Chat session deleted', {
      chatSessionId,
      deleted,
    });

    return deleted;
  } catch (error) {
    logger.error('Chat session deletion failed', {
      chatSessionId,
      error: error.message,
    });
    throw error;
  }
};
