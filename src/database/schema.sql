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
  is_active BOOLEAN DEFAULT true
);

-- Pending registrations table (users not yet verified)
CREATE TABLE IF NOT EXISTS pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Identity keys table (X25519 public keys for E2EE)
CREATE TABLE IF NOT EXISTS identity_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  public_key_hex TEXT NOT NULL,
  key_algorithm VARCHAR(50) DEFAULT 'X25519',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat sessions table (1-to-1 chat rooms)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL,
  user_b_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_chat_pair UNIQUE (
    CASE WHEN user_a_id < user_b_id THEN user_a_id ELSE user_b_id END,
    CASE WHEN user_a_id < user_b_id THEN user_b_id ELSE user_a_id END
  )
);

-- Messages table (encrypted messages)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  ciphertext TEXT NOT NULL,
  iv_hex TEXT NOT NULL,
  tag_hex TEXT NOT NULL,
  sender_public_key_hex TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_delivered BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  FOREIGN KEY (chat_session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_registrations(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_email_purpose ON otp_sessions(email, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_blocked ON otp_sessions(blocked_until);
CREATE INDEX IF NOT EXISTS idx_identity_keys_user_id ON identity_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_a ON chat_sessions(user_a_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_b ON chat_sessions(user_b_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active ON chat_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_messages_chat_session ON messages(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_delivered ON messages(is_delivered);
