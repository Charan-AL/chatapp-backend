# Architecture Overview

Complete technical architecture and design decisions for the Chat App Authentication Backend.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Android / Web Frontend                        │
│                                                                   │
│  [Registration] → [OTP Verification] → [JWT Token]              │
│  [Login] → [OTP Verification] → [JWT Token]                     │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Express.js API Server                         │
│                   (Node.js 18+, Railway)                         │
│                                                                   │
│  Routes:                                                          │
│  ├── POST /api/auth/register                                    │
│  ├── POST /api/auth/register/verify-otp                         │
│  ├── POST /api/auth/login                                       │
│  ├── POST /api/auth/login/verify-otp                            │
│  ├── POST /api/auth/resend-otp                                  │
│  └── GET /api/auth/otp-status                                   │
│                                                                   │
│  Middleware:                                                      │
│  ├── helmet.js (Security headers)                               │
│  ├── CORS                                                         │
│  ├── Rate Limiter (express-rate-limit)                          │
│  ├── Request Validation                                          │
│  ├── Error Handler                                               │
│  └── JWT Verification                                            │
│                                                                   │
│  Services:                                                        │
│  ├── Auth Service (orchestration)                               │
│  ├── OTP Service (generation, validation, cooldown)             │
│  ├── User Service (CRUD)                                        │
│  └── Email Service (Brevo SMTP)                                 │
│                                                                   │
│  Utilities:                                                       │
│  ├── hash.js (bcryptjs)                                         │
│  ├── crypto.js (OTP generation, timers)                         │
│  └── logger.js (structured logging)                             │
└────────┬────────────────────────────┬────────────────────────┬──┘
         │ JDBC                       │ SMTP                   │
         ↓                            ↓                        │
    ┌────────────┐           ┌──────────────┐                │
    │ PostgreSQL │           │ Brevo SMTP   │                │
    │ Database   │           │ (Email)      │                │
    │ • users    │           │              │                │
    │ • pending_ │           └──────────────┘                │
    │   registr. │                                            │
    │ • otp_     │                                            │
    │   sessions │                                            │
    └────────────┘                                            │
                                                              │
                                                    ┌─────────┘
                                                    │ Railway
                                                    │ Platform
                                                    │
                                                    │ • Docker
                                                    │ • Auto-deploy
                                                    │ • SSL/TLS
                                                    │ • CDN
```

## Module Architecture

### 1. Auth Service (Orchestrator)

**Purpose**: Orchestrates the complete authentication flow.

**Responsibilities:**
- User registration process
- Login process
- OTP verification (registration & login)
- OTP resend logic
- JWT token generation and verification

**Key Methods:**
- `register(email, phone, password)` → Creates pending registration + sends OTP
- `verifyRegistrationOtp(email, otp)` → Creates user account + issues JWT
- `login(email, password)` → Validates credentials + sends OTP
- `verifyLoginOtp(email, otp)` → Issues JWT
- `resendOtp(email, purpose)` → Resend OTP with cooldown check

### 2. OTP Service (Core Logic)

**Purpose**: Manages OTP lifecycle with security rules.

**Responsibilities:**
- OTP session creation
- OTP hashing and validation
- Attempt counting
- Blocking logic (after max attempts)
- Cooldown enforcement
- Expiry handling
- Session cleanup

**Key Methods:**
- `createOtpSession(email, purpose)` → Generate OTP, hash, store session
- `verifyOtp(email, otp, purpose)` → Validate OTP with attempt/block checks
- `getOtpSessionDetails(email, purpose)` → Return UI-friendly status
- `deleteOtpSession(email, purpose)` → Clean up after verification
- `cleanupExpiredOtpSessions()` → Periodic cleanup

**Security Features:**
```
┌─────────────────────────────────────────┐
│    OTP Session Creation                 │
├─────────────────────────────────────────┤
│ 1. Generate 10-digit OTP                │
│ 2. Hash OTP (bcryptjs)                  │
│ 3. Set expiry = now + OTP_EXPIRY_MIN    │
│ 4. Set attempt_count = 0                │
│ 5. Set blocked_until = NULL             │
│ 6. Store in DB (OTP never logged)       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    OTP Verification                     │
├─────────────────────────────────────────┤
│ 1. Check session exists                 │
│ 2. Verify not expired                   │
│ 3. Check if blocked                     │
│ 4. Compare OTP hash                     │
│ 5. If wrong → increment attempt_count   │
│ 6. If max attempts → set blocked_until  │
│ 7. If correct → return success          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│    Cooldown Logic                       │
├─────────────────────────────────────────┤
│ blocked_until = now + COOLDOWN_MIN      │
│                                          │
│ User blocked while:                      │
│   current_time < blocked_until           │
│                                          │
│ Frontend shows countdown:                │
│   remaining_seconds = blocked_until - now│
└─────────────────────────────────────────┘
```

### 3. Email Service

**Purpose**: Abstract email delivery.

**Responsibilities:**
- Brevo SMTP configuration
- OTP email template
- Email sending with error handling
- Connection testing

**Key Methods:**
- `sendOtpEmail(email, otp)` → Send OTP via Brevo
- `testEmailConnection()` → Verify SMTP is working

**Important:**
- OTP is NOT logged
- OTP is NOT stored in email logs
- Uses HTML template with branding
- Includes security disclaimers

### 4. User Service

**Purpose**: User CRUD operations.

**Responsibilities:**
- Create user account
- Retrieve user by email/ID
- Update last login
- Check user existence
- Deactivate users

**Key Methods:**
- `createUser(email, phone, password)` → Create account with hashed password
- `getUserByEmail(email)` → Fetch user (password excluded)
- `getUserWithPassword(email)` → Fetch user for login
- `updateLastLogin(userId)` → Update login timestamp

### 5. Controllers

**Purpose**: Handle HTTP requests and delegate to services.

**Responsibilities:**
- Request parsing
- Calling services
- Response formatting
- Error catching (via async handler)

**Pattern:**
```javascript
// Controller catches errors and passes to error handler
export const someController = async (req, res, next) => {
  try {
    const result = await authService.doSomething();
    res.json(result);
  } catch (error) {
    next(error); // Pass to error handler middleware
  }
};
```

## Data Flow Diagrams

### Registration Flow

```
Frontend                    Backend                        Database
   │                           │                               │
   │─ email, phone, pwd ───────→ POST /register               │
   │                           │                               │
   │                           │─ Create pending_registration  │
   │                           │────────────────────────────→  │
   │                           │                    {pending}   │
   │                           │                               │
   │                           │─ Create otp_session           │
   │                           │────────────────────────────→  │
   │                           │                    {otp_hash}  │
   │                           │                               │
   │                           │─ Generate OTP                 │
   │                           │  (NOT stored, only hash)      │
   │                           │                               │
   │                           │─ Send OTP email via Brevo     │
   │                           │                               │
   │← OTP expires_at, time ────│                               │
   │                           │                               │
   │─ email, OTP ──────────────→ POST /register/verify-otp    │
   │                           │                               │
   │                           │─ Verify OTP (hash comparison) │
   │                           │                               │
   │                           │─ Create user account          │
   │                           │────────────────────────────→  │
   │                           │                    {user}      │
   │                           │                               │
   │                           │─ Delete pending_registration  │
   │                           │────────────────────────────→  │
   │                           │                               │
   │                           │─ Delete otp_session           │
   │                           │────────────────────────────→  │
   │                           │                               │
   │                           │─ Generate JWT                 │
   │                           │                               │
   │← JWT token, user ─────────│                               │
   │                           │                               │
```

### Login Flow with Cooldown

```
Frontend                    Backend                        Database
   │                           │                               │
   │─ email, password ─────────→ POST /login                  │
   │                           │                               │
   │                           │─ Verify credentials           │
   │                           │                               │
   │                           │─ Create otp_session           │
   │                           │────────────────────────────→  │
   │                           │                    {otp_hash}  │
   │                           │                               │
   │                           │─ Send OTP email via Brevo     │
   │                           │                               │
   │← OTP expires_at ──────────│                               │
   │                           │                               │
   │─ email, wrong OTP ────────→ POST /login/verify-otp       │
   │                           │                               │
   │                           │─ Compare OTP hash (FAIL)      │
   │                           │                               │
   │                           │─ Increment attempt_count      │
   │                           │────────────────────────────→  │
   │                           │                    {count:1}   │
   │                           │                               │
   │← Error: 2 attempts left ──│                               │
   │                           │                               │
   │─ email, wrong OTP ────────→ POST /login/verify-otp       │
   │                           │                               │
   │                           │─ Increment attempt_count      │
   │                           │────────────────────────────→  │
   │                           │                    {count:2}   │
   │                           │                               │
   │← Error: 1 attempt left ───│                               │
   │                           │                               │
   │─ email, wrong OTP ────────→ POST /login/verify-otp       │
   │                           │                               │
   │                           │─ Increment attempt_count      │
   │                           │─ Set blocked_until = now+5min │
   │                           │────────────────────────────→  │
   │                           │                    {blocked}   │
   │                           │                               │
   │← Error: Too many attempts │                               │
   │                           │                               │
   │─ email, otp, resend? ─────→ POST /resend-otp             │
   │                           │                               │
   │                           │─ Check blocked_until          │
   │                           │─ blocked_until > now_time?    │
   │                           │                               │
   │← Error: Wait 5 minutes ───│                               │
   │                           │                               │
   │  [After 5 minutes]        │                               │
   │                           │                               │
   │─ email, resend ───────────→ POST /resend-otp             │
   │                           │                               │
   │                           │─ Check blocked_until          │
   │                           │─ blocked_until < now_time? ✓  │
   │                           │                               │
   │                           │─ Create new otp_session       │
   │                           │────────────────────────────→  │
   │                           │                    {new_otp}   │
   │                           │                               │
   │← New OTP expires_at ──────│                               │
   │                           │                               │
   │─ email, correct OTP ──────→ POST /login/verify-otp       │
   │                           │                               │
   │                           │─ Compare OTP hash (SUCCESS)   │
   │                           │                               │
   │                           │─ Delete otp_session           │
   │                           │────────────────────────────→  │
   │                           │                               │
   │                           │─ Generate JWT                 │
   │                           │                               │
   │← JWT token ───────────────│                               │
   │                           │                               │
```

## Security Architecture

### Password Security

```
Registration/Login:
├── Password from client
├── Hash with bcryptjs (10 salt rounds)
├── Store hashed password in DB
│
Login:
├── Get stored hash from DB
├── Compare client password with hash
├── Never store plaintext
└── Never return password in API
```

### OTP Security

```
OTP Generation:
├── Generate 10-digit numeric (1000000000-9999999999)
├── Hash with bcryptjs
├── Store hash in otp_sessions
├── Return plaintext ONLY for email delivery
│
OTP Verification:
├── Get hashed OTP from DB
├── Compare plaintext OTP with hash
├── Enforce attempt counting
├── Enforce cooldown after max attempts
├── Auto-delete after verification
└── Auto-expire after timeout
```

### JWT Security

```
Token Generation:
├── Algorithm: HS256
├── Payload: userId, email
├── Expiry: JWT_EXPIRY (default: 7 days)
├── Secret: JWT_SECRET (32+ chars)
└── Issued ONLY after OTP verification
```

### Rate Limiting Strategy

```
Auth Endpoints (login, register):
├── 5 requests/minute per IP
├── 5 requests/minute per email (if provided)
└── Key by IP + email
    
OTP Endpoints (verify, resend):
├── 3 requests/5 minutes per IP
├── 3 requests/5 minutes per email
└── Enforced database-side (blocked_until)

General API:
├── 10 requests/minute per IP
└── Skip for GET requests
```

## Database Design

### Users Table

```sql
id (UUID PRIMARY KEY)
├── Unique identifier for user
│
email (VARCHAR UNIQUE)
├── Unique email address
├── Index: idx_users_email
│
phone (VARCHAR)
├── Phone number (any format)
│
password_hash (VARCHAR)
├── Bcryptjs hash
├── Never returned in API
│
is_email_verified (BOOLEAN)
├── True after OTP verification
│
created_at (TIMESTAMP)
├── Account creation time
│
updated_at (TIMESTAMP)
├── Last update time
│
last_login_at (TIMESTAMP)
├── For analytics
│
is_active (BOOLEAN)
├── For soft deactivation
```

### Pending Registrations Table

```sql
id (UUID PRIMARY KEY)
├── Unique identifier
│
email (VARCHAR UNIQUE)
├── Email being registered
├── Index: idx_pending_email
│
phone (VARCHAR)
├── Phone to link to account
│
password_hash (VARCHAR)
├── Temporary hash storage
│
created_at (TIMESTAMP)
├── Registration start time
│
expires_at (TIMESTAMP)
├── Auto-delete after expiry
├── Index: idx_pending_expires
└── Cleaned by: OTP_EXPIRY_MINUTES
```

### OTP Sessions Table

```sql
id (UUID PRIMARY KEY)
├── Session identifier
│
email (VARCHAR)
├── User email
├── Index: idx_otp_email
│
otp_hash (VARCHAR)
├── Bcryptjs hash of OTP
├── Never returns plaintext
│
attempt_count (INT)
├── Track verification attempts
├── Increment on failed attempts
├── Block after OTP_MAX_ATTEMPTS (default: 3)
│
blocked_until (TIMESTAMP)
├── Enforces cooldown
├── Set when attempt_count >= OTP_MAX_ATTEMPTS
├── Set to: now + OTP_RESEND_COOLDOWN_MINUTES
├── Index: idx_otp_blocked
│
expires_at (TIMESTAMP)
├── OTP validity window
├── Set to: now + OTP_EXPIRY_MINUTES
├── Auto-delete if passed
├── Index: idx_otp_expires
│
purpose (VARCHAR)
├── Values: 'login' | 'registration'
├── Enforced via CHECK constraint
├── Index: idx_otp_email_purpose
│
created_at (TIMESTAMP)
├── Session start time
│
updated_at (TIMESTAMP)
└── Last modification time
```

## Error Handling Architecture

```
Request
  │
  ├─ Routes
  │  └─ Controllers
  │     └─ Services
  │        └─ Utilities/DB
  │           └─ Error occurs ─┐
  │                            │
  │                            ↓
  └──────────────────── Error Handler Middleware
                              │
                              ├─ Log error (sanitized)
                              │
                              ├─ Categorize:
                              │  ├─ Validation (400)
                              │  ├─ Auth (401)
                              │  ├─ OTP (400/429)
                              │  ├─ Conflict (409)
                              │  ├─ Not Found (404)
                              │  └─ Server (500)
                              │
                              ├─ Format response:
                              │  ├─ success: false
                              │  ├─ message: user-friendly
                              │  ├─ error_type: machine-readable
                              │  └─ debug: dev-only
                              │
                              └─→ Send to Client
```

## Middleware Pipeline

```
Request
  │
  ├─ helmet() - Security headers
  │
  ├─ cors() - CORS validation
  │
  ├─ express.json() - Body parsing
  │
  ├─ Request logging - Info logging
  │
  ├─ Rate limiter - Prevent abuse
  │
  ├─ Route handler
  │  │
  │  └─ Validation middleware
  │     ├─ Check required fields
  │     ├─ Validate email format
  │     ├─ Validate phone format
  │     └─ Validate password strength
  │
  ├─ Controller → Service → Database
  │
  └─ Error Handler - Catch all errors
     │
     ├─ Categorize
     ├─ Log
     └─ Response to client
```

## Configuration Management

### Environment Variables (Hierarchical)

```
Application Level:
├─ NODE_ENV (development|production)
├─ PORT (3000)
├─ APP_NAME, APP_URL
└─ LOG_LEVEL

Security:
├─ JWT_SECRET (must be strong)
├─ JWT_EXPIRY (7d default)
└─ (Passwords/OTPs are hashed, not configured)

OTP Configuration:
├─ OTP_EXPIRY_MINUTES (15 default)
├─ OTP_RESEND_COOLDOWN_MINUTES (5 default)
└─ OTP_MAX_ATTEMPTS (3 default)

Email (Brevo):
├─ SMTP_HOST
├─ SMTP_PORT
├─ SMTP_USER
├─ SMTP_PASSWORD
├─ SMTP_FROM_EMAIL
└─ SMTP_FROM_NAME

Database:
└─ DATABASE_URL (auto on Railway)
```

### Loading Priority

1. `.env` file (development)
2. Railway environment variables (production)
3. Default values in code (with validation)

## Scalability Considerations

### Current Design Handles:

- **100 concurrent users** (single Railway instance)
- **1,000 requests/minute** (Express + rate limiting)
- **100 OTPs/minute** (Brevo SMTP)
- **10,000 users** (PostgreSQL default tier)

### Scale to 1,000+ Users:

1. **Add Railway Instances**: Railway auto-scales
2. **Database**: Upgrade PostgreSQL tier
3. **Email**: Brevo handles millions/day
4. **Caching**: Add Redis for sessions (future)
5. **CDN**: Use Railway's built-in CDN

### Bottleneck Analysis:

```
Bottleneck          Cause              Solution
────────────────────────────────────────────────────
Email sending       Brevo SMTP API     Upgrade to Brevo Pro
OTP validation      DB queries         Add indexes (done)
JWT generation      CPU                CPU not bottleneck
Password hashing    bcryptjs time      Salt rounds (10)
Memory              Connections        Connection pooling
```

## Future Extensions

**Designed to support:**
- Additional auth methods (Google, Apple)
- Phone OTP (alongside email)
- 2FA (second factor)
- Sessions management
- Device tracking
- Audit logging
- Rate limiting per user (not just IP)

**Not included (out of scope):**
- Chat features
- Messaging
- Encryption at app level (use TLS)
- WebSocket (future auth module)

## Testing Strategy

**Unit Tests:**
- Hash utilities
- Crypto utilities
- Logger

**Integration Tests:**
- Services with database
- Email service with Brevo
- API endpoints

**Load Tests:**
- Brevo SMTP throughput
- Database query performance
- OTP cleanup task

**Security Tests:**
- OTP never logged
- Password never returned
- Rate limiting effectiveness
- SQL injection prevention (via parameterized queries)
