import validator from 'validator';

/**
 * Validate required fields in request body
 * @param {string[]} requiredFields - Array of required field names
 */
export const validateRequestBody = (requiredFields = []) => {
  return (req, res, next) => {
    const errors = [];

    // Check if body exists
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: 'Request body is required',
      });
    }

    // Check for required fields
    requiredFields.forEach(field => {
      if (!req.body[field] || req.body[field] === '') {
        errors.push(`${field} is required`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Additional validations based on field names
    if (req.body.email && !validator.isEmail(req.body.email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    if (req.body.phone) {
      const phone = req.body.phone.replace(/\D/g, '');
      if (!/^\d{10,}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format',
        });
      }
    }

    if (req.body.password && req.body.password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    if (req.body.otp) {
      if (!/^\d{10}$/.test(req.body.otp)) {
        return res.status(400).json({
          success: false,
          message: 'OTP must be a 10-digit number',
        });
      }
    }

    next();
  };
};

/**
 * Validate query parameters
 * @param {string[]} requiredParams - Array of required parameter names
 */
export const validateQueryParams = (requiredParams = []) => {
  return (req, res, next) => {
    const errors = [];

    requiredParams.forEach(param => {
      if (!req.query[param] || req.query[param] === '') {
        errors.push(`${param} is required`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    next();
  };
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  return validator.isEmail(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return false;
  }
  return true;
};

/**
 * Sanitize email
 */
export const sanitizeEmail = (email) => {
  return validator.normalizeEmail(email);
};
