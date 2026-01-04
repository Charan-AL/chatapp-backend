import express from 'express';
import * as chatController from '../modules/chat/chatController.js';
import { verifyToken } from '../middlewares/auth.js';
import { validateRequestBody } from '../middlewares/validation.js';

const router = express.Router();

/**
 * All chat routes require authentication
 */
router.use(verifyToken);

/**
 * POST /api/chat/create
 * Create a new chat session with another user
 * Body: { otherUserId?: string, otherUserEmail?: string }
 */
router.post(
  '/create',
  validateRequestBody([], ['otherUserId', 'otherUserEmail']),
  chatController.createChatController
);

/**
 * GET /api/chat/list
 * Get all chat sessions for the current user
 */
router.get('/list', chatController.listChatsController);

/**
 * GET /api/chat/:chatSessionId/messages
 * Get messages from a chat session
 * Query params: limit=50, offset=0
 */
router.get('/:chatSessionId/messages', chatController.getMessagesController);

/**
 * POST /api/identity-key/create
 * Create or update identity key for the current user
 * Body: { publicKeyHex: string }
 */
router.post(
  '/identity-key/create',
  validateRequestBody(['publicKeyHex']),
  chatController.createIdentityKeyController
);

/**
 * GET /api/identity-key/:userId
 * Get public identity key for a user
 */
router.get('/identity-key/:userId', chatController.getIdentityKeyController);

/**
 * GET /api/users/search?query=email
 * Search for users by email
 * Query params: query (minimum 3 characters)
 */
router.get('/users/search', chatController.searchUsersController);

export default router;
