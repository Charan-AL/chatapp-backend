# Chat App Authentication Backend

A production-grade, secure authentication system for a chat app using Node.js + Express + PostgreSQL, deployable on Railway.

## ⚠️ Scope

This backend implements ONLY:
- ✅ User Registration with Email OTP Verification
- ✅ User Login with Email OTP Verification
- ✅ Secure JWT Token Issuance

**NOT included:**
- ❌ Chat features
- ❌ Messaging
- ❌ Group chat
- ❌ Encryption (use TLS/SSL at transport level)

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL 15+
- **Authentication**: JWT (HS256)
- **Email**: Brevo SMTP
- **Hashing**: bcryptjs
- **Rate Limiting**: express-rate-limit
- **Security**: Helmet.js

### Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── app.js                 # Application configuration
│   │   └── database.js            # PostgreSQL connection pool
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── authService.js     # Auth logic
│   │   │   └── authController.js  # Request handlers
│   │   ├── email/
│   │   │   └── emailService.js    # Brevo SMTP service
│   │   ├── otp/
│   │   │   └── otpService.js      # OTP generation, validation, cooldown
│   │   └── users/
│   │       └── userService.js     # User CRUD operations
│   ├── routes/
│   │   └── authRoutes.js          # Auth API endpoints
│   ├── middlewares/
│   │   ├── auth.js                # JWT verification
│   │   ├── errorHandler.js        # Error handling
│   │   ├── rateLimiter.js         # Rate limiting
│   │   └── validation.js          # Request validation
│   ├── utils/
│   │   ├── hash.js                # Password & OTP hashing
│   │   ├── crypto.js              # OTP generation, token utilities
│   │   └── logger.js              # Structured logging
│   ├── database/
│   │   └── schema.sql             # Database tables
│   ├── app.js                     # Express app setup
│   └── server.js                  # Server entry point
├── scripts/
│   └── migrate.js                 # Database migration runner
├── Dockerfile                     # Docker image definition
├── docker-compose.yml             # Local development setup
├── package.json                   # Dependencies
├── .env.example                   # Environment template
└── README.md                      # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Docker
- PostgreSQL 15+
- Brevo SMTP credentials
- Git

### Local Development (without Docker)

1. **Clone and Install**
```bash
cd backend
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your values:
# - DATABASE_URL (PostgreSQL connection string)
# - SMTP credentials from Brevo
# - JWT_SECRET (generate a secure key)
# - OTP timing values
```

3. **Run Database Migrations**
```bash
npm run migrate
```

4. **Start Development Server**
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Docker Compose (Recommended)

```bash
docker-compose up --build
```

This starts:
- PostgreSQL database (port 5432)
- Node.js app (port 3000)
- Automatic migrations

## 🌍 Railway Deployment

### Environment Variables (Railway)

Set these in Railway's environment:

```env
# Database (auto-provided by Railway PostgreSQL plugin)
DATABASE_URL=postgresql://...

# Server
NODE_ENV=production
PORT=3000

# Security
JWT_SECRET=your_secure_key_here

# OTP Configuration (REQUIRED - read from env)
OTP_EXPIRY_MINUTES=15
OTP_RESEND_COOLDOWN_MINUTES=5
OTP_MAX_ATTEMPTS=3

# Email (Brevo)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_email@example.com
SMTP_PASSWORD=your_brevo_api_key
SMTP_FROM_EMAIL=noreply@yourchatapp.com
SMTP_FROM_NAME=ChatApp

# App
APP_NAME=ChatApp
APP_URL=https://your-app.com
```

### Railway Setup

1. **Push code to GitHub** and connect to Railway
2. **Add PostgreSQL plugin** in Railway
3. **Set environment variables** (see above)
4. **Deploy** - Railway handles:
   - Building Docker image
   - Running migrations
   - Starting server on assigned port

## 🔐 Security Features

### Password Security
- ✅ Bcryptjs hashing (10 salt rounds)
- ✅ Never returned in API responses
- ✅ Only compared in memory

### OTP Security
- ✅ 10-digit numeric OTP
- ✅ Hashed before storage
- ✅ Never logged or exposed
- ✅ Deleted after verification
- ✅ Automatic expiry
- ✅ Single active OTP per user
- ✅ Max 3 attempts before cooldown
- ✅ Cooldown enforced via `blocked_until` timestamp

### Authentication
- ✅ JWT tokens (HS256)
- ✅ No token issued before OTP verification
- ✅ Token expiry set to 7 days (configurable)

### Rate Limiting
- ✅ Auth endpoints: 5 requests/minute
- ✅ OTP endpoints: 3 requests/5 minutes
- ✅ General API: 10 requests/minute

### Error Handling
- ✅ Centralized error middleware
- ✅ No sensitive data in error messages
- ✅ Consistent error response format

## 📋 Database Schema

### users
```sql
id (UUID)
email (VARCHAR UNIQUE)
phone (VARCHAR)
password_hash (VARCHAR)
is_email_verified (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
last_login_at (TIMESTAMP)
is_active (BOOLEAN)
```

### pending_registrations
```sql
id (UUID)
email (VARCHAR UNIQUE)
phone (VARCHAR)
password_hash (VARCHAR)
created_at (TIMESTAMP)
expires_at (TIMESTAMP)
```

### otp_sessions
```sql
id (UUID)
email (VARCHAR)
otp_hash (VARCHAR)
attempt_count (INT)
blocked_until (TIMESTAMP)
expires_at (TIMESTAMP)
purpose (VARCHAR: 'login' | 'registration')
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

## 🔗 API Endpoints

### Registration

**POST /api/auth/register**
- Body: `{ email, phone, password }`
- Response: OTP sent to email with expiry info

**POST /api/auth/register/verify-otp**
- Body: `{ email, otp }`
- Response: User object + JWT token

### Login

**POST /api/auth/login**
- Body: `{ email, password }`
- Response: OTP sent to email with expiry info

**POST /api/auth/login/verify-otp**
- Body: `{ email, otp }`
- Response: User object + JWT token

### OTP Management

**POST /api/auth/resend-otp**
- Body: `{ email, purpose: 'login' | 'registration' }`
- Response: New OTP sent with expiry

**GET /api/auth/otp-status?email=user@example.com&purpose=login**
- Response: OTP session status (expiry, attempts, blocked status)

### Token Verification

**POST /api/auth/verify**
- Headers: `Authorization: Bearer <token>`
- Response: Decoded user info (userId, email)

## 🔄 Authentication Flows

### Registration Flow (Strict)

1. **User submits**: email, phone, password
2. **Backend**:
   - Creates PENDING registration (not a real user)
   - Generates 10-digit numeric OTP
   - Hashes OTP
   - Sets expiry = now + OTP_EXPIRY_MINUTES
   - Sets attempt_count = 0
   - Sends OTP via Brevo SMTP
3. **User enters OTP**:
   - If valid and not expired → create real user, delete pending registration, issue JWT
   - If invalid → increment attempt_count
   - If attempt_count reaches OTP_MAX_ATTEMPTS → set blocked_until
   - If expired → delete pending registration, user must register again

### Login Flow

1. **User submits**: email, password
2. **Backend**:
   - Validates credentials
   - Sends OTP to email
   - Creates OTP session
3. **OTP verification**:
   - Max 3 wrong attempts
   - After 3 failures → block for OTP_RESEND_COOLDOWN_MINUTES
   - After cooldown → allow resend
   - OTP expires after OTP_EXPIRY_MINUTES
4. **On success**: Issue JWT, delete OTP session

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "...",
  "error_type": "AUTH_ERROR|OTP_ERROR|VALIDATION_ERROR|...",
  "debug": "... (only in development)"
}
```

## 🧪 Testing

Example registration flow:

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "phone": "1234567890",
    "password": "securepass123"
  }'

# Response: OTP sent to email

# 2. Verify OTP (use OTP from email)
curl -X POST http://localhost:3000/api/auth/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "1234567890"
  }'

# Response: JWT token

# 3. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepass123"
  }'

# Response: OTP sent to email

# 4. Verify login OTP
curl -X POST http://localhost:3000/api/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "1234567890"
  }'

# Response: JWT token
```

## 📧 Email Configuration (Brevo)

1. Create Brevo account at https://www.brevo.com/
2. Get SMTP credentials from Brevo dashboard
3. Configure in `.env`:
   ```
   SMTP_USER=your_brevo_email@example.com
   SMTP_PASSWORD=your_brevo_api_key
   SMTP_FROM_EMAIL=noreply@yourchatapp.com
   ```

## 🐛 Debugging

### Enable Debug Logging
```bash
export NODE_ENV=development
export LOG_LEVEL=debug
npm run dev
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT NOW();"
```

### Email Issues
```bash
# Test Brevo SMTP
telnet smtp-relay.brevo.com 587
```

## 📚 Additional Notes

### Environment Variable Validation
All required environment variables are validated at startup. Missing values will prevent server from starting.

### OTP Cleanup
Expired OTP sessions and pending registrations are automatically cleaned up:
- On demand via `cleanupExpiredOtpSessions()` and `cleanupExpiredRegistrations()`
- Can be scheduled as cron jobs in production

### JWT Token
- Issued after OTP verification (never before)
- Algorithm: HS256
- Default expiry: 7 days (configurable)
- Payload: userId, email

### Logging
- Structured JSON logs
- Sensitive data (OTP, passwords) automatically redacted
- Log levels: error, warn, info, debug

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Change port
export PORT=3001
npm run dev
```

### Database Connection Failed
```bash
# Check DATABASE_URL format:
# postgresql://user:password@host:port/database
psql "your-database-url"
```

### Brevo SMTP Connection Failed
1. Verify credentials in .env
2. Check if Brevo account is verified
3. Test with telnet to smtp-relay.brevo.com:587

## 📄 License

ISC

## 👥 Support

For issues and questions:
1. Check this README
2. Review error logs with LOG_LEVEL=debug
3. Verify all environment variables
4. Check Brevo SMTP credentials
5. Ensure PostgreSQL is running and accessible
