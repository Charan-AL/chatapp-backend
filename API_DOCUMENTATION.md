# API Documentation

Complete reference for Chat App Authentication Backend API.

## Base URL

```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication

Most endpoints require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response (2xx)
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response (4xx, 5xx)
```json
{
  "success": false,
  "message": "Error description",
  "error_type": "ERROR_TYPE",
  "errors": ["field error 1", "field error 2"]
}
```

## Endpoints

### 1. Registration

#### POST /api/auth/register

Register a new user account (Step 1: Create pending registration and send OTP).

**Request**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "password": "SecurePass123!"
  }'
```

**Request Body**
```json
{
  "email": "john.doe@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!"
}
```

**Validation Rules**
- email: Valid email format, must be unique
- phone: 10 digits (numeric only)
- password: Minimum 6 characters

**Response (201 Created)**
```json
{
  "success": true,
  "message": "Registration initiated. Please verify your email with the OTP sent.",
  "email": "john.doe@example.com",
  "otp_expires_at": "2024-01-15T10:15:00Z",
  "otp_expires_in_seconds": 900
}
```

**Error Responses**

400 Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "email is required",
    "Invalid email format"
  ],
  "error_type": "VALIDATION_ERROR"
}
```

409 Conflict
```json
{
  "success": false,
  "message": "User with this email already exists",
  "error_type": "CONFLICT"
}
```

**Notes**
- OTP is sent immediately to the email
- OTP expires in OTP_EXPIRY_MINUTES (default: 15 minutes)
- Pending registration record is created (not a real user yet)
- User must verify OTP within expiry to create real account

---

#### POST /api/auth/register/verify-otp

Verify registration OTP and create user account (Step 2).

**Request**
```bash
curl -X POST http://localhost:3000/api/auth/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "otp": "1234567890"
  }'
```

**Request Body**
```json
{
  "email": "john.doe@example.com",
  "otp": "1234567890"
}
```

**Validation Rules**
- email: Must match registration email
- otp: Exactly 10 digits

**Response (200 OK)**
```json
{
  "success": true,
  "message": "Registration completed successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "is_email_verified": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**

400 Bad Request - Invalid OTP
```json
{
  "success": false,
  "message": "Invalid OTP. 2 attempts remaining",
  "error_type": "OTP_ERROR"
}
```

400 Bad Request - OTP Expired
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new one.",
  "error_type": "OTP_EXPIRED"
}
```

429 Too Many Attempts
```json
{
  "success": false,
  "message": "Too many attempts. Please try again after 5 minutes",
  "error_type": "RATE_LIMITED"
}
```

404 Not Found
```json
{
  "success": false,
  "message": "No active OTP session. Please login or register first.",
  "error_type": "OTP_NOT_FOUND"
}
```

**Notes**
- Maximum 3 OTP attempts allowed (OTP_MAX_ATTEMPTS)
- After 3 failed attempts, user is blocked for OTP_RESEND_COOLDOWN_MINUTES (default: 5 minutes)
- OTP is deleted after successful verification
- JWT token expires in JWT_EXPIRY (default: 7 days)

---

### 2. Login

#### POST /api/auth/login

Login user with email and password (Step 1: Send OTP to email).

**Request**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

**Request Body**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules**
- email: Valid email format
- password: Required

**Response (200 OK)**
```json
{
  "success": true,
  "message": "OTP sent to your email. Please verify to login.",
  "email": "john.doe@example.com",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "otp_expires_at": "2024-01-15T10:15:00Z",
  "otp_expires_in_seconds": 900
}
```

**Error Responses**

401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid email or password",
  "error_type": "AUTH_ERROR"
}
```

429 Too Many Requests
```json
{
  "success": false,
  "message": "Too many authentication attempts, please try again later.",
  "error_type": "RATE_LIMITED"
}
```

**Notes**
- OTP is sent to registered email address
- Password is verified using bcryptjs (10 salt rounds)
- OTP expires in OTP_EXPIRY_MINUTES (default: 15 minutes)
- No JWT issued yet; user must verify OTP

---

#### POST /api/auth/login/verify-otp

Verify login OTP and issue JWT token (Step 2).

**Request**
```bash
curl -X POST http://localhost:3000/api/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "otp": "1234567890"
  }'
```

**Request Body**
```json
{
  "email": "john.doe@example.com",
  "otp": "1234567890"
}
```

**Validation Rules**
- email: Must match login email
- otp: Exactly 10 digits

**Response (200 OK)**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "phone": "9876543210",
    "is_email_verified": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**

400 Bad Request - Invalid OTP
```json
{
  "success": false,
  "message": "Invalid OTP. 2 attempts remaining",
  "error_type": "OTP_ERROR"
}
```

400 Bad Request - OTP Expired
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new one.",
  "error_type": "OTP_EXPIRED"
}
```

429 Too Many Attempts
```json
{
  "success": false,
  "message": "Too many attempts. Please try again after 5 minutes",
  "error_type": "RATE_LIMITED"
}
```

**Notes**
- Maximum 3 OTP verification attempts (OTP_MAX_ATTEMPTS)
- After 3 failures, blocked for OTP_RESEND_COOLDOWN_MINUTES
- JWT token includes userId and email
- Token validity: JWT_EXPIRY (default: 7 days)
- User's last_login timestamp is updated

---

### 3. OTP Management

#### POST /api/auth/resend-otp

Resend OTP to user's email.

**Request**
```bash
curl -X POST http://localhost:3000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "purpose": "login"
  }'
```

**Request Body**
```json
{
  "email": "john.doe@example.com",
  "purpose": "login"
}
```

**Purpose Values**
- `login`: Resend OTP for login flow
- `registration`: Resend OTP for registration flow

**Response (200 OK)**
```json
{
  "success": true,
  "message": "New OTP sent to your email",
  "email": "john.doe@example.com",
  "otp_expires_at": "2024-01-15T10:15:00Z",
  "otp_expires_in_seconds": 900
}
```

**Error Responses**

400 Bad Request - User Not Blocked Yet
```json
{
  "success": false,
  "message": "Please wait before requesting a new OTP",
  "error_type": "VALIDATION_ERROR"
}
```

429 Too Many Requests - User is Blocked
```json
{
  "success": false,
  "message": "Too many attempts. Please try again after 5 minutes",
  "error_type": "RATE_LIMITED"
}
```

404 Not Found
```json
{
  "success": false,
  "message": "No active login session found",
  "error_type": "OTP_NOT_FOUND"
}
```

**Notes**
- Can only resend if previous OTP has expired
- If blocked, must wait OTP_RESEND_COOLDOWN_MINUTES
- New OTP replaces old one
- Previous OTP becomes invalid

---

#### GET /api/auth/otp-status

Get current OTP session status (for countdown timers, UI state).

**Request**
```bash
curl "http://localhost:3000/api/auth/otp-status?email=john.doe@example.com&purpose=login"
```

**Query Parameters**
- `email` (required): User email
- `purpose` (optional): `login` or `registration` (default: `login`)

**Response (200 OK)**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "expiresAt": "2024-01-15T10:15:00Z",
    "expiresInSeconds": 523,
    "hasExpired": false,
    "attemptCount": 1,
    "attemptsRemaining": 2,
    "isBlocked": false,
    "blockedUntil": null,
    "blockedUntilSeconds": 0
  }
}
```

**Error Response**

404 Not Found
```json
{
  "success": false,
  "message": "No active OTP session found"
}
```

**Frontend Usage**
```javascript
// Countdown timer
const remaining = response.data.expiresInSeconds;
setInterval(() => {
  console.log(`OTP expires in ${remaining--} seconds`);
}, 1000);

// Show/hide resend button
if (response.data.isBlocked) {
  console.log(`Wait ${response.data.blockedUntilSeconds} seconds before resend`);
} else if (response.data.hasExpired) {
  console.log('OTP expired, allow user to resend');
}

// Show attempt feedback
console.log(`${response.data.attemptsRemaining} attempts remaining`);
```

---

### 4. Token Verification

#### POST /api/auth/verify

Verify JWT token validity (optional - for frontend to validate token).

**Request**
```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Headers**
```
Authorization: Bearer <token>
```

**Response (200 OK)**
```json
{
  "success": true,
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "iat": 1705315200,
    "exp": 1705920000
  }
}
```

**Error Response**

401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/auth/register | 5 | 1 minute |
| /api/auth/login | 5 | 1 minute |
| /api/auth/resend-otp | 3 | 5 minutes |
| /api/auth/*/verify-otp | 3 | 5 minutes |
| Other GET endpoints | 10 | 1 minute |
| Other POST endpoints | 10 | 1 minute |

**Exceeded Limit Response**
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later.",
  "error_type": "RATE_LIMITED"
}
```

---

## OTP Security Rules

✅ **Always enforced:**
- 10-digit numeric OTP only
- Hashed with bcryptjs before storage
- Never logged in any form
- Deleted after successful verification
- Invalid after expiry time
- Only one active OTP per user/session
- Maximum 3 verification attempts
- Automatic cooldown after max attempts
- Cooldown duration: OTP_RESEND_COOLDOWN_MINUTES

---

## Common Error Codes

| Error Type | HTTP | Meaning |
|-----------|------|---------|
| VALIDATION_ERROR | 400 | Missing/invalid request data |
| AUTH_ERROR | 401 | Authentication failure |
| OTP_ERROR | 400 | OTP verification failed |
| OTP_EXPIRED | 400 | OTP has expired |
| OTP_NOT_FOUND | 404 | No active OTP session |
| CONFLICT | 409 | Email already registered |
| RATE_LIMITED | 429 | Too many requests |
| CONFIG_ERROR | 500 | Server configuration issue |
| DB_ERROR | 500 | Database operation failed |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## Environment Variables Reference

All variables should be set in `.env` or Railway environment:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Server
NODE_ENV=production
PORT=3000

# JWT
JWT_SECRET=your_secure_key_here
JWT_EXPIRY=7d

# OTP (in minutes)
OTP_EXPIRY_MINUTES=15
OTP_RESEND_COOLDOWN_MINUTES=5
OTP_MAX_ATTEMPTS=3

# Email (Brevo SMTP)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_api_key
SMTP_FROM_EMAIL=noreply@example.com
SMTP_FROM_NAME=ChatApp

# Logging
LOG_LEVEL=info
```

---

## Frontend Integration Guide

### 1. Registration
```javascript
// Step 1: Submit registration
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    phone: '1234567890',
    password: 'SecurePass123!'
  })
});

const { otp_expires_at, otp_expires_in_seconds } = await registerResponse.json();

// Show countdown timer
startCountdown(otp_expires_in_seconds);

// Step 2: Verify OTP
const verifyResponse = await fetch('/api/auth/register/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    otp: '1234567890'
  })
});

const { token } = await verifyResponse.json();
localStorage.setItem('token', token);
```

### 2. Login
```javascript
// Step 1: Login with credentials
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

// Step 2: Verify OTP
const verifyResponse = await fetch('/api/auth/login/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    otp: '1234567890'
  })
});

const { token } = await verifyResponse.json();
localStorage.setItem('token', token);
```

### 3. Using JWT Token
```javascript
// Add token to requests
const response = await fetch('/api/protected-route', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

### 4. OTP Status for UI
```javascript
// Poll for OTP session status
const statusResponse = await fetch(
  '/api/auth/otp-status?email=user@example.com&purpose=login'
);

const { data } = await statusResponse.json();

// Show expiry countdown
console.log(`OTP expires in ${data.expiresInSeconds} seconds`);

// Show attempt feedback
console.log(`${data.attemptsRemaining} attempts remaining`);

// Handle blocked state
if (data.isBlocked) {
  console.log(`Wait ${data.blockedUntilSeconds} seconds before resend`);
}
```

---

## Troubleshooting

### "Invalid email or password"
- Verify email and password are correct
- Check email has been registered
- Ensure password matches

### "OTP has expired"
- OTP valid for OTP_EXPIRY_MINUTES only (default: 15 min)
- Request new OTP using /api/auth/resend-otp
- Register or login again

### "Too many attempts"
- Maximum OTP_MAX_ATTEMPTS (default: 3) attempts allowed
- Wait OTP_RESEND_COOLDOWN_MINUTES (default: 5 min) before retry
- Check OTP status with /api/auth/otp-status

### "User with this email already exists"
- Email is already registered
- Try logging in instead of registering
- Use a different email for new account

### Rate limiting (429)
- Too many requests in short time
- Wait before retrying
- Spread out requests
