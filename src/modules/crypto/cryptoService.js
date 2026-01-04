import crypto from 'crypto';
import logger from '../../utils/logger.js';

/**
 * Generate X25519 key pair for identity keys
 * @returns {Promise<object>} Object with publicKey and privateKey in hex format
 */
export const generateX25519KeyPair = async () => {
  try {
    // Generate X25519 key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('x25519');

    // Export keys as raw bytes (X25519 keys are 32 bytes each)
    const publicKeyRaw = publicKey.export({ format: 'raw' });
    const privateKeyRaw = privateKey.export({ format: 'raw' });

    // Convert to hex for storage/transmission
    const publicKeyHex = publicKeyRaw.toString('hex');
    const privateKeyHex = privateKeyRaw.toString('hex');

    return {
      publicKeyHex,
      privateKeyHex,
      publicKeyBuffer: publicKeyRaw,
      privateKeyBuffer: privateKeyRaw,
    };
  } catch (error) {
    logger.error('X25519 key pair generation failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Validate X25519 public key format
 * @param {string} publicKeyHex - Public key in hex format
 * @returns {boolean} Whether key is valid X25519 key
 */
export const validateX25519PublicKey = (publicKeyHex) => {
  try {
    // X25519 public keys are exactly 32 bytes (64 hex characters)
    if (!/^[0-9a-f]{64}$/i.test(publicKeyHex)) {
      return false;
    }

    // Try to import the key to validate it
    const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');
    crypto.createPublicKey({
      key: publicKeyBuffer,
      format: 'raw',
      type: 'x25519',
    });

    return true;
  } catch (error) {
    logger.warn('X25519 public key validation failed', {
      error: error.message,
    });
    return false;
  }
};

/**
 * Perform X25519 ECDH to derive shared secret
 * NOTE: This is for validation only - actual ECDH should be done on client side
 * @param {string} publicKeyHex - Remote public key in hex
 * @param {string} privateKeyHex - Local private key in hex
 * @returns {Promise<string>} Derived shared secret in hex format
 */
export const performX25519ECDH = async (publicKeyHex, privateKeyHex) => {
  try {
    const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');
    const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');

    // Import public key
    const publicKey = crypto.createPublicKey({
      key: publicKeyBuffer,
      format: 'raw',
      type: 'x25519',
    });

    // Import private key
    const privateKey = crypto.createPrivateKey({
      key: privateKeyBuffer,
      format: 'raw',
      type: 'x25519',
    });

    // Compute shared secret
    const sharedSecret = crypto.diffieHellman({
      privateKey,
      publicKey,
    });

    return sharedSecret.toString('hex');
  } catch (error) {
    logger.error('X25519 ECDH failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Derive session key using HKDF-SHA256
 * @param {string} sharedSecretHex - Shared secret from ECDH in hex
 * @param {string} salt - Optional salt (16 bytes)
 * @param {string} info - Optional context info
 * @returns {Promise<string>} Derived session key in hex format (32 bytes for AES-256)
 */
export const deriveSessionKey = async (sharedSecretHex, salt = null, info = '') => {
  try {
    const sharedSecret = Buffer.from(sharedSecretHex, 'hex');

    // Use HKDF-SHA256 to derive session key
    const derivedKey = crypto.hkdf(
      'sha256',
      sharedSecret,
      salt ? Buffer.from(salt, 'hex') : undefined,
      info ? Buffer.from(info, 'utf-8') : Buffer.from('aes-256-gcm-key'),
      32 // Output 32 bytes for AES-256
    );

    return derivedKey.toString('hex');
  } catch (error) {
    logger.error('HKDF key derivation failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Derive IV (initialization vector) using HKDF-SHA256
 * @param {string} sharedSecretHex - Shared secret from ECDH in hex
 * @param {string} messageCounter - Message counter/nonce
 * @returns {Promise<string>} Derived IV in hex format (12 bytes for AES-256-GCM)
 */
export const deriveIV = async (sharedSecretHex, messageCounter = '0') => {
  try {
    const sharedSecret = Buffer.from(sharedSecretHex, 'hex');

    // Use HKDF-SHA256 to derive IV
    const derivedIV = crypto.hkdf(
      'sha256',
      sharedSecret,
      Buffer.from('iv-salt'),
      Buffer.from(`iv-${messageCounter}`, 'utf-8'),
      12 // Output 12 bytes for AES-256-GCM
    );

    return derivedIV.toString('hex');
  } catch (error) {
    logger.error('HKDF IV derivation failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Hash a value using SHA-256 (for token generation, session IDs, etc.)
 * @param {string} input - Input to hash
 * @returns {string} SHA-256 hash in hex format
 */
export const hashSHA256 = (input) => {
  try {
    const hash = crypto.createHash('sha256');
    hash.update(input);
    return hash.digest('hex');
  } catch (error) {
    logger.error('SHA-256 hashing failed', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Generate random bytes
 * @param {number} length - Number of bytes to generate
 * @returns {string} Random bytes in hex format
 */
export const generateRandomBytes = (length = 32) => {
  try {
    return crypto.randomBytes(length).toString('hex');
  } catch (error) {
    logger.error('Random bytes generation failed', {
      error: error.message,
    });
    throw error;
  }
};
