-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  INDEX idx_email (email),
  INDEX idx_phone (phone)
);

-- Pending registrations table (users not yet verified)
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_email (email),
  INDEX idx_expires_at (expires_at)
);

-- OTP sessions table
CREATE TABLE IF NOT EXISTS otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  attempt_count INT DEFAULT 0,
  blocked_until TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('login', 'registration')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_purpose (email, purpose),
  INDEX idx_expires_at (expires_at),
  INDEX idx_blocked_until (blocked_until)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_registrations(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_sessions(email, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_blocked ON otp_sessions(blocked_until);

-- Cleanup function for expired OTP sessions (optional, can be scheduled)
CREATE OR REPLACE FUNCTION cleanup_expired_otp_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_sessions WHERE expires_at < CURRENT_TIMESTAMP;
  DELETE FROM pending_registrations WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
