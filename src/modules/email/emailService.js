import nodemailer from 'nodemailer';
import appConfig from '../../config/app.js';
import logger from '../../utils/logger.js';

// Create SMTP transporter for Brevo
let transporter = null;

/**
 * Initialize email transporter (lazy initialization)
 * @returns {object} Nodemailer transporter
 */
const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: appConfig.email.host,
    port: appConfig.email.port,
    secure: appConfig.email.port === 465, // Use TLS if port is 465
    auth: {
      user: appConfig.email.user,
      pass: appConfig.email.password,
    },
    connectionTimeout: 10000, // 10 seconds
    socketTimeout: 10000,     // 10 seconds
    connectionUrl: `smtp://${appConfig.email.user}:${appConfig.email.password}@${appConfig.email.host}:${appConfig.email.port}`,
  });

  logger.info('Email transporter initialized');
  return transporter;
};

/**
 * Send OTP email to user
 * IMPORTANT: OTP is never logged, printed, or included in error messages
 * @param {string} email - Recipient email
 * @param {string} otp - Plain text OTP (will NOT be logged)
 * @returns {Promise<object>} Email send result
 */
export const sendOtpEmail = async (email, otp) => {
  if (!email || !otp) {
    throw new Error('Email and OTP are required');
  }

  try {
    const transporter = getTransporter();

    const htmlContent = generateOtpEmailTemplate(otp);

    const mailOptions = {
      from: `${appConfig.email.fromName} <${appConfig.email.fromEmail}>`,
      to: email,
      subject: `${appConfig.appName} - Your Verification Code`,
      html: htmlContent,
      text: `Your verification code is: ${otp}. Do not share this code with anyone. This code will expire in ${appConfig.otp.expiryMinutes} minutes.`,
    };

    const info = await transporter.sendMail(mailOptions);

    // Log success without exposing OTP
    logger.info('OTP email sent successfully', {
      messageId: info.messageId,
      recipient: email,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error('Failed to send OTP email', {
      recipient: email,
      error: error.message,
    });
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

/**
 * Generate HTML email template for OTP
 * @param {string} otp - Plain text OTP
 * @returns {string} HTML email content
 */
const generateOtpEmailTemplate = (otp) => {
  const expiryMinutes = appConfig.otp.expiryMinutes;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 30px 20px;
          }
          .content p {
            margin: 10px 0;
            color: #333333;
            line-height: 1.6;
          }
          .otp-section {
            background-color: #f9f9f9;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            text-align: center;
            color: #667eea;
            letter-spacing: 5px;
            font-family: 'Courier New', monospace;
            margin: 15px 0;
          }
          .expiry-notice {
            background-color: #fff3cd;
            color: #856404;
            padding: 10px 15px;
            border-radius: 4px;
            margin: 15px 0;
            font-size: 14px;
          }
          .footer {
            background-color: #f5f5f5;
            padding: 20px;
            text-align: center;
            color: #666666;
            font-size: 12px;
            border-top: 1px solid #e0e0e0;
          }
          .security-notice {
            background-color: #e8f4f8;
            color: #004085;
            padding: 10px 15px;
            border-radius: 4px;
            margin: 15px 0;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${appConfig.appName}</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You're receiving this email because a verification request was made for your account.</p>
            
            <div class="otp-section">
              <p style="margin-top: 0; color: #666;">Your verification code is:</p>
              <div class="otp-code">${otp}</div>
              <p style="margin-bottom: 0; color: #666; text-align: center;">Enter this code in the app to verify your account</p>
            </div>

            <div class="expiry-notice">
              <strong>⏱️ Expires in ${expiryMinutes} minutes</strong> - Do not share this code with anyone. Once this code expires, you will need to request a new one.
            </div>

            <div class="security-notice">
              <strong>🔒 Security Notice:</strong> We will never ask you for this code via email or phone. If you didn't request this code, you can safely ignore this email.
            </div>

            <p>If you have any questions or concerns, please contact our support team.</p>
            <p>Best regards,<br><strong>${appConfig.appName} Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${appConfig.appName}. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Test email connection to Brevo
 * @returns {Promise<boolean>} True if connection successful
 */
export const testEmailConnection = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    logger.info('Email connection verified successfully');
    return true;
  } catch (error) {
    logger.error('Email connection test failed', {
      error: error.message,
    });
    throw error;
  }
};

export default {
  sendOtpEmail,
  testEmailConnection,
};
