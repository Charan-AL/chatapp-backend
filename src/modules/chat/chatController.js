import * as chatSessionService from './chatSessionService.js';
import * as messageService from './messageService.js';
import * as identityKeyService from '../crypto/identityKeyService.js';
import * as userService from '../users/userService.js';
import logger from '../../utils/logger.js';

/**
 * POST /api/chat/create
 * Create a new 1-to-1 chat session with another user
 */
export const createChatController = async (req, res, next) => {
  try {
    const { otherUserId, otherUserEmail } = req.body;
    const currentUserId = req.user?.userId; // From JWT middleware

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Find the other user if email is provided
    let targetUserId = otherUserId;
    if (!otherUserId && otherUserEmail) {
      const targetUser = await userService.getUserByEmail(otherUserEmail);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      targetUserId = targetUser.id;
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID or email is required',
      });
    }

    // Create or get chat session
    const chatSession = await chatSessionService.createOrGetChatSession(currentUserId, targetUserId);

    // Get other user's identity key
    const otherUserIdentityKey = await identityKeyService.getIdentityKeyByUserId(targetUserId);

    res.status(201).json({
      success: true,
      message: 'Chat session created',
      chatSession: {
        id: chatSession.id,
        otherUserId: targetUserId,
        createdAt: chatSession.created_at,
        otherUserPublicKey: otherUserIdentityKey?.public_key_hex || null,
      },
    });
  } catch (error) {
    logger.error('Create chat controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * GET /api/chat/list
 * Get all chat sessions for the current user
 */
export const listChatsController = async (req, res, next) => {
  try {
    const currentUserId = req.user?.userId; // From JWT middleware

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const chatSessions = await chatSessionService.getUserChatSessions(currentUserId, true);

    res.status(200).json({
      success: true,
      chats: chatSessions.map(chat => ({
        id: chat.id,
        otherUserId: chat.other_user_id,
        otherUserEmail: chat.other_user_email,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      })),
    });
  } catch (error) {
    logger.error('List chats controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * GET /api/chat/:chatSessionId/messages
 * Get messages from a chat session
 */
export const getMessagesController = async (req, res, next) => {
  try {
    const { chatSessionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Verify user is part of this chat session
    const chatSession = await chatSessionService.getChatSessionById(chatSessionId);
    if (!chatSession) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found',
      });
    }

    if (chatSession.user_a_id !== currentUserId && chatSession.user_b_id !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to access this chat',
      });
    }

    const messages = await messageService.getMessagesByChatSession(
      chatSessionId,
      parseInt(limit),
      parseInt(offset)
    );

    res.status(200).json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        ciphertext: msg.ciphertext,
        ivHex: msg.iv_hex,
        tagHex: msg.tag_hex,
        senderPublicKeyHex: msg.sender_public_key_hex,
        createdAt: msg.created_at,
        isDelivered: msg.is_delivered,
        isRead: msg.is_read,
      })),
    });
  } catch (error) {
    logger.error('Get messages controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * POST /api/identity-key/create
 * Create or update identity key for the current user
 */
export const createIdentityKeyController = async (req, res, next) => {
  try {
    const { publicKeyHex } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!publicKeyHex) {
      return res.status(400).json({
        success: false,
        message: 'Public key is required',
      });
    }

    const identityKey = await identityKeyService.createOrUpdateIdentityKey(
      currentUserId,
      publicKeyHex
    );

    res.status(201).json({
      success: true,
      message: 'Identity key created/updated',
      identityKey: {
        id: identityKey.id,
        publicKeyHex: identityKey.public_key_hex,
        algorithm: identityKey.key_algorithm,
      },
    });
  } catch (error) {
    logger.error('Create identity key controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * GET /api/identity-key/:userId
 * Get public identity key for a user
 */
export const getIdentityKeyController = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const identityKey = await identityKeyService.getIdentityKeyByUserId(userId);

    if (!identityKey) {
      return res.status(404).json({
        success: false,
        message: 'Identity key not found',
      });
    }

    res.status(200).json({
      success: true,
      identityKey: {
        id: identityKey.id,
        userId: identityKey.user_id,
        publicKeyHex: identityKey.public_key_hex,
        algorithm: identityKey.key_algorithm,
        createdAt: identityKey.created_at,
      },
    });
  } catch (error) {
    logger.error('Get identity key controller error', {
      error: error.message,
    });
    next(error);
  }
};

/**
 * GET /api/users/search?query=email_or_username
 * Search for users by email
 */
export const searchUsersController = async (req, res, next) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Query must be at least 3 characters',
      });
    }

    const users = await userService.searchUsersByEmail(query, currentUserId, 10);

    res.status(200).json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        phone: user.phone,
        isEmailVerified: user.is_email_verified,
      })),
    });
  } catch (error) {
    logger.error('Search users controller error', {
      error: error.message,
    });
    next(error);
  }
};
