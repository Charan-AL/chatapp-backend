import appConfig from '../config/app.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const LEVEL_NAMES = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

/**
 * Sanitize sensitive data from log messages
 * Prevents OTP, passwords, tokens from being logged
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data
 */
const sanitizeData = (data) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveKeys = ['otp', 'password', 'token', 'jwt', 'secret', 'apiKey', 'api_key'];

  const sanitizeObject = (obj) => {
    Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    });
  };

  sanitizeObject(sanitized);
  return sanitized;
};

/**
 * Format log message with timestamp and level
 * @param {number} level - Log level
 * @param {string} message - Log message
 * @param {any} meta - Additional metadata
 * @returns {string} Formatted log message
 */
const formatLog = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const levelName = LEVEL_NAMES[level] || 'UNKNOWN';
  
  let logMessage = `[${timestamp}] [${levelName}] ${message}`;
  
  if (meta) {
    const sanitizedMeta = sanitizeData(meta);
    logMessage += ` ${JSON.stringify(sanitizedMeta)}`;
  }
  
  return logMessage;
};

/**
 * Log a message at specified level
 * @param {number} level - Log level
 * @param {string} message - Log message
 * @param {any} meta - Additional metadata
 */
const log = (level, message, meta) => {
  const currentLevel = LOG_LEVELS[appConfig.logging.level] || LOG_LEVELS.info;

  if (level > currentLevel) {
    return; // Don't log if level is below configured level
  }

  const formattedLog = formatLog(level, message, meta);
  const isError = level === LOG_LEVELS.error;

  if (isError) {
    console.error(formattedLog);
  } else {
    console.log(formattedLog);
  }
};

/**
 * Logger object with convenience methods
 */
const logger = {
  error: (message, meta) => log(LOG_LEVELS.error, message, meta),
  warn: (message, meta) => log(LOG_LEVELS.warn, message, meta),
  info: (message, meta) => log(LOG_LEVELS.info, message, meta),
  debug: (message, meta) => log(LOG_LEVELS.debug, message, meta),
};

export default logger;
