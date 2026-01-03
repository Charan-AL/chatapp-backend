# Test API Flow - Complete Authentication Walkthrough

**Status**: 🚀 Ready to Test

Test the entire authentication flow after deployment to Railway.

---

## Prerequisites

✅ Backend deployed to Railway  
✅ Database migrations completed  
✅ Server running on `https://anon-chat-backend.up.railway.app`  
✅ Brevo SMTP credentials configured (optional for testing without email)

---

## Step 1: Test Health Endpoint

**Verify the server is running:**

```bash
curl -X GET https://anon-chat-backend.up.railway.app/health
```

**Expected Response (200 OK):**
```json
{
  "status": "OK",
  "timestamp": "2026-01-03T11:25:00.000Z",
  "environment": "production"
}
```

**If 404 or timeout:**
- ❌ Server not responding
- Check Railway logs: "Server running on port X"
- Verify domain is correct
- Wait 1-2 minutes for cold start

---

## Step 2: User Registration (Send OTP)

**Register new user:**

```bash
curl -X POST https://anon-chat-backend.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@gmail.com",
    "phone": "9876543210",
    "password": "TestPassword123!"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "OTP sent to your email",
  "data": {
    "email": "testuser@gmail.com",
    "otpSessionId": "550e8400-e29b-41d4-a716-446655440000",
    "expiresIn": 900
  }
}
```

**If error, check:**
- Email format (must be valid)
- Phone format (digits only, 10+ chars)
- Password strength (min 8 chars, uppercase, lowercase, number)
- Database connection (check Railway logs)

**If SMTP error in logs:**
- OTP stored in database but email not sent
- Check Brevo credentials in Railway Variables
- Still proceed to next step (manual testing without email)

---

## Step 3: Verify Registration OTP

**Get the OTP from database or email, then verify:**

```bash
curl -X POST https://anon-chat-backend.up.railway.app/api/auth/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@gmail.com",
    "otp": "123456"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Registration successful",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "email": "testuser@gmail.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**If error:**
- **"OTP expired"** → Generate new OTP (see Step 4)
- **"Invalid OTP"** → Check OTP value (case-sensitive)
- **"Account locked"** → Too many wrong attempts (wait 15 mins)

---

## Step 4: Resend OTP (if needed)

**Request new OTP:**

```bash
curl -X POST https://anon-chat-backend.up.railway.app/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@gmail.com",
    "purpose": "registration"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "OTP resent to your email",
  "data": {
    "email": "testuser@gmail.com",
    "expiresIn": 900
  }
}
```

**Rate limiting:**
- Can resend after 5 minutes of last attempt
- Max 3 attempts per OTP session
- After 3 failures, locked for 15 minutes

---

## Step 5: Login (Send OTP)

**Login with registered email:**

```bash
curl -X POST https://anon-chat-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@gmail.com",
    "password": "TestPassword123!"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "OTP sent to your email",
  "data": {
    "email": "testuser@gmail.com",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "expiresIn": 900
  }
}
```

**If error:**
- **"User not found"** → Email not registered yet (do Step 2-3)
- **"Invalid password"** → Wrong password
- **"Account locked"** → Too many login attempts

---

## Step 6: Verify Login OTP

**Verify OTP from email:**

```bash
curl -X POST https://anon-chat-backend.up.railway.app/api/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@gmail.com",
    "otp": "123456"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "email": "testuser@gmail.com",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Step 7: Verify Token

**Use JWT token to verify authentication:**

```bash
curl -X POST https://anon-chat-backend.up.railway.app/api/auth/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{}'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "email": "testuser@gmail.com"
  }
}
```

---

## Step 8: Check OTP Status

**Get OTP session info:**

```bash
curl -X GET "https://anon-chat-backend.up.railway.app/api/auth/otp-status?email=testuser@gmail.com&purpose=login"
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "expiresAt": "2026-01-03T11:35:00.000Z",
    "expiresInSeconds": 600,
    "attemptCount": 1,
    "attemptsRemaining": 2,
    "isBlocked": false,
    "blockedUntilSeconds": 0
  }
}
```

---

## Common Test Scenarios

### Scenario 1: Happy Path (User Registration & Login)
1. ✅ Register with email, phone, password
2. ✅ Verify OTP from registration
3. ✅ Login with email and password
4. ✅ Verify OTP from login
5. ✅ Use JWT token for authenticated requests

### Scenario 2: Expired OTP
1. ✅ Register (OTP sent)
2. ⏳ Wait 16 minutes (OTP expires after 15 min)
3. ❌ Try to verify → "OTP expired"
4. ✅ Resend OTP
5. ✅ Verify new OTP

### Scenario 3: Invalid OTP
1. ✅ Register (OTP sent)
2. ❌ Try wrong OTP 3 times
3. 🔒 Account locked for 15 minutes
4. ❌ Try correct OTP → "Account locked"
5. ⏳ Wait 15 minutes
6. ✅ Retry → Works

### Scenario 4: Rate Limiting
1. ✅ Register endpoint
2. ❌ Call 6 times in 1 minute
3. ❌ 6th call → "Too many requests (429)"
4. ⏳ Wait 1 minute
5. ✅ Call again → Works

---

## Testing with Postman / Insomnia

### Import into Postman:

1. **New Collection** → `Chat App API`
2. **Create Requests:**
   - Health Check (GET)
   - Register (POST)
   - Verify Reg OTP (POST)
   - Login (POST)
   - Verify Login OTP (POST)
   - Verify Token (POST)
   - OTP Status (GET)

3. **Environment Variables:**
   ```json
   {
     "base_url": "https://anon-chat-backend.up.railway.app",
     "email": "testuser@gmail.com",
     "token": "eyJ..."
   }
   ```

4. **Test in Order:**
   - Health → Register → Verify Reg → Login → Verify Login → Verify Token

---

## Debugging

### Check Server Logs
```
Railway Dashboard → Logs → Filter by level
```

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 404 Application Not Found | Server not running | Check Railway status |
| Connection timeout | Database offline | Verify PostgreSQL running |
| "Unterminated dollar-quoted string" | SQL syntax error | Already fixed ✅ |
| "Invalid OTP" | Wrong code | Get from database/email |
| "Rate limit exceeded" | Too many requests | Wait 1-5 minutes |

### Get Real OTP from Database
```bash
# Connect to Railway PostgreSQL
psql $DATABASE_URL

# List OTP sessions
SELECT email, otp_hash, expires_at, purpose FROM otp_sessions 
WHERE email = 'testuser@gmail.com' 
ORDER BY created_at DESC LIMIT 1;

# Note: otp_hash is bcrypt hashed, not readable
# For testing, update it directly (not recommended for production)
```

---

## Response Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | OTP sent, registration complete |
| 400 | Bad request | Invalid email format, missing fields |
| 401 | Unauthorized | Invalid token, wrong password |
| 403 | Forbidden | Account locked after too many attempts |
| 404 | Not found | Endpoint doesn't exist, server down |
| 429 | Too many requests | Rate limit exceeded |
| 500 | Server error | Database error, SMTP error |

---

## Performance Notes

✅ **Expected Response Times:**
- Health check: < 50ms
- Register: 200-500ms (with email send)
- OTP verify: < 100ms
- Login: 100-300ms (with password hash)
- Token verify: < 50ms

❌ **If slower:**
- Database connection issue
- Email service slow
- Railway instance under load

---

## What to Test on Android App

After API tests pass:

```kotlin
// In your Android app
val email = "testuser@gmail.com"
val phone = "9876543210"
val password = "TestPassword123!"

// 1. Register
registerUser(email, phone, password)
  .onSuccess { otpSessionId -> /* proceed to OTP */ }
  .onError { showError("Registration failed") }

// 2. Verify OTP (show input for 6-digit code)
verifyRegistrationOTP(email, otp)
  .onSuccess { token -> /* save token */ }
  .onError { showError("Invalid OTP") }

// 3. Login
loginUser(email, password)
  .onSuccess { /* proceed to OTP verification */ }
  .onError { showError("Login failed") }

// 4. Use token for authenticated requests
val headers = mapOf("Authorization" to "Bearer $token")
authenticatedRequest(headers)
```

---

## Success Checklist

After running all tests:

- [ ] Health endpoint returns OK
- [ ] Register creates OTP session in database
- [ ] Verify registration OTP completes registration
- [ ] Login creates new OTP session
- [ ] Verify login OTP returns JWT token
- [ ] Token verify returns user info
- [ ] Rate limiting blocks repeated requests
- [ ] OTP expiry works (after 15 mins)
- [ ] Account lockout works (after 3 failures)
- [ ] Android app can call all endpoints

🎉 **Ready for production!**

---

## Next Steps

1. Run through all test scenarios
2. Verify Android app integration
3. Monitor Railway logs for errors
4. Set up database backups
5. Configure custom domain (optional)
6. Enable monitoring and alerts

**Questions?** Check:
- `DEPLOYMENT_GUIDE.md` - Full deployment docs
- `RAILWAY_SETUP_CHECKLIST.md` - Railway setup
- `FIXES_APPLIED.md` - What was fixed
