# Setup & Deployment Checklist

Complete checklist for setting up and deploying the Chat App Authentication Backend.

## 📋 Pre-Deployment Setup

### 1. Local Development Environment

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 15+ installed or Docker
- [ ] Git configured
- [ ] Text editor/IDE ready (VSCode, etc.)

### 2. Brevo Account Setup

- [ ] Create Brevo account (https://www.brevo.com/)
- [ ] Verify email address in Brevo
- [ ] Get SMTP credentials:
  - [ ] SMTP_USER (email)
  - [ ] SMTP_PASSWORD (API key)
- [ ] Test SMTP connection:
  ```bash
  telnet smtp-relay.brevo.com 587
  ```

### 3. GitHub Repository

- [ ] Repository created
- [ ] Backend folder ready with all source files
- [ ] `.env.example` in backend root
- [ ] `.gitignore` configured (node_modules, .env, etc.)
- [ ] Code pushed to GitHub (main branch)

## 🚀 Local Development Setup

### 4. Install Dependencies

```bash
cd backend
npm install
```

- [ ] Dependencies installed
- [ ] No peer dependency warnings
- [ ] `node_modules/` created

### 5. Database Setup

**Option A: Local PostgreSQL**
```bash
# Create database
createdb chat_auth_db

# Set connection string
export DATABASE_URL="postgresql://localhost:5432/chat_auth_db"
```

**Option B: Docker Compose**
```bash
docker-compose up --build
```

- [ ] Database created
- [ ] `DATABASE_URL` set
- [ ] Connection verified:
  ```bash
  psql $DATABASE_URL -c "SELECT NOW();"
  ```

### 6. Environment Configuration

```bash
# Copy template
cp .env.example .env

# Edit .env with values:
```

- [ ] `DATABASE_URL` set
- [ ] `JWT_SECRET` generated (strong random key)
- [ ] `SMTP_HOST` = `smtp-relay.brevo.com`
- [ ] `SMTP_USER` = your Brevo email
- [ ] `SMTP_PASSWORD` = your Brevo API key
- [ ] `OTP_EXPIRY_MINUTES` set (default: 15)
- [ ] `OTP_RESEND_COOLDOWN_MINUTES` set (default: 5)
- [ ] `OTP_MAX_ATTEMPTS` set (default: 3)
- [ ] `NODE_ENV` = `development`

### 7. Database Migrations

```bash
npm run migrate
```

- [ ] Migrations executed without errors
- [ ] `users` table created
- [ ] `pending_registrations` table created
- [ ] `otp_sessions` table created
- [ ] Indexes created
- [ ] Cleanup function created

### 8. Start Development Server

```bash
npm run dev
```

- [ ] Server started on port 3000
- [ ] "Database connected" in logs
- [ ] "Email service connected" in logs
- [ ] No errors in startup logs

## ✅ Local Testing

### 9. Health Check

```bash
curl http://localhost:3000/health
```

- [ ] Returns 200 OK
- [ ] Response includes timestamp
- [ ] Environment shows "development"

### 10. Test Registration Flow

```bash
# Step 1: Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "phone": "1234567890",
    "password": "TestPass123!"
  }'
```

- [ ] Returns 201 Created
- [ ] Response includes `otp_expires_at`
- [ ] Response includes `otp_expires_in_seconds`
- [ ] OTP received in email (check inbox/spam)

```bash
# Step 2: Verify OTP (use OTP from email)
curl -X POST http://localhost:3000/api/auth/register/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "otp": "YOUR_OTP_HERE"
  }'
```

- [ ] Returns 200 OK
- [ ] Response includes JWT token
- [ ] Response includes user object
- [ ] User created in database
- [ ] Pending registration deleted
- [ ] OTP session deleted

### 11. Test Login Flow

```bash
# Step 1: Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "password": "TestPass123!"
  }'
```

- [ ] Returns 200 OK
- [ ] OTP sent to email
- [ ] Response includes expiry info

```bash
# Step 2: Verify OTP
curl -X POST http://localhost:3000/api/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "otp": "YOUR_OTP_HERE"
  }'
```

- [ ] Returns 200 OK
- [ ] JWT token returned
- [ ] User last_login_at updated

### 12. Test OTP Validation

```bash
# Send wrong OTP (attempt 1)
curl -X POST http://localhost:3000/api/auth/login/verify-otp \
  -d '{"email": "test1@example.com", "otp": "0000000000"}'
```

- [ ] Returns 400 error
- [ ] Message says "2 attempts remaining"

```bash
# Send wrong OTP again (attempt 2)
# Send wrong OTP third time (attempt 3 - blocks user)
```

- [ ] After 3rd wrong attempt: 429 Too Many Requests
- [ ] Message says "wait X minutes"
- [ ] blocked_until set in database

### 13. Test OTP Resend

```bash
curl -X POST http://localhost:3000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test1@example.com",
    "purpose": "login"
  }'
```

- [ ] If not expired: Error (wait message)
- [ ] If blocked: 429 (wait X minutes)
- [ ] If expired: New OTP sent

### 14. Test OTP Status

```bash
curl "http://localhost:3000/api/auth/otp-status?email=test1@example.com&purpose=login"
```

- [ ] Returns OTP session status
- [ ] Includes expiresInSeconds
- [ ] Includes attemptsRemaining
- [ ] Includes isBlocked, blockedUntilSeconds

### 15. Test Token Verification

```bash
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

- [ ] Returns 200 OK
- [ ] Decoded token payload returned
- [ ] Includes userId, email, iat, exp

## 🐳 Docker Setup (Optional)

### 16. Build Docker Image

```bash
docker build -t chat-auth-backend .
```

- [ ] Image built successfully
- [ ] No build errors
- [ ] Image tagged correctly

### 17. Run with Docker Compose

```bash
docker-compose up --build
```

- [ ] PostgreSQL container started
- [ ] App container started
- [ ] Migrations ran automatically
- [ ] Server listening on port 3000

- [ ] Health check passes
- [ ] Can access from `http://localhost:3000`

## 🌍 Railway Deployment

### 18. Create Railway Account

- [ ] Railway account created (https://railway.app/)
- [ ] Connected to GitHub
- [ ] Authorized Railway access to repository

### 19. Create Railway Project

- [ ] New project created
- [ ] GitHub repo connected
- [ ] Backend folder configured (if monorepo)
- [ ] Auto-deploy enabled

### 20. Add PostgreSQL Plugin

- [ ] PostgreSQL plugin added
- [ ] Database provisioned
- [ ] `DATABASE_URL` auto-set
- [ ] Database running

### 21. Set Environment Variables

In Railway dashboard, set all required variables:

- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `JWT_SECRET=` (strong random key)
- [ ] `JWT_EXPIRY=7d`
- [ ] `OTP_EXPIRY_MINUTES=15`
- [ ] `OTP_RESEND_COOLDOWN_MINUTES=5`
- [ ] `OTP_MAX_ATTEMPTS=3`
- [ ] `SMTP_HOST=smtp-relay.brevo.com`
- [ ] `SMTP_PORT=587`
- [ ] `SMTP_USER=` (your Brevo email)
- [ ] `SMTP_PASSWORD=` (your Brevo API key)
- [ ] `SMTP_FROM_EMAIL=noreply@yourchatapp.com`
- [ ] `SMTP_FROM_NAME=ChatApp`
- [ ] `APP_NAME=ChatApp`
- [ ] `APP_URL=https://your-app.railway.app`
- [ ] `LOG_LEVEL=info`

### 22. Deploy to Railway

```bash
git push origin main
```

- [ ] Code pushed to GitHub
- [ ] Railway auto-deployment triggered
- [ ] Docker build started
- [ ] Migrations running
- [ ] App starting on assigned port

### 23. Monitor Deployment

In Railway dashboard:

- [ ] Build succeeded
- [ ] App deployed
- [ ] Container healthy
- [ ] No error logs

Check logs for:
- [ ] "Database connected"
- [ ] "Email service connected"
- [ ] "🚀 Server running"

### 24. Get Railway Domain

- [ ] Railway assigned domain (e.g., `your-app.railway.app`)
- [ ] Domain shows in Railway dashboard
- [ ] HTTPS enabled automatically

## 🧪 Production Testing

### 25. Test Health Endpoint

```bash
curl https://your-app.railway.app/health
```

- [ ] Returns 200 OK
- [ ] Environment shows "production"

### 26. Test Registration on Production

```bash
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "prod-test@example.com",
    "phone": "1234567890",
    "password": "TestPass123!"
  }'
```

- [ ] Returns 201 Created
- [ ] OTP sent to email
- [ ] Email delivery works

### 27. Complete Full Login/Verify Flow

- [ ] Register with test email
- [ ] Receive OTP
- [ ] Verify OTP
- [ ] Get JWT token
- [ ] Login with same credentials
- [ ] OTP verification works
- [ ] Get new JWT token

### 28. Test Error Handling

```bash
# Missing email
curl -X POST https://your-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "test"}'
```

- [ ] Returns 400 Bad Request
- [ ] Error message clear
- [ ] No sensitive data in error

### 29. Monitor Logs

In Railway dashboard:

- [ ] Check logs for errors
- [ ] Monitor CPU usage
- [ ] Monitor memory usage
- [ ] Monitor network I/O

## 🔒 Security Verification

### 30. Verify No Hardcoded Secrets

```bash
# Check backend folder
grep -r "jwt_secret" backend/src/
grep -r "password=" backend/src/
grep -r "smtp_password" backend/src/
```

- [ ] No hardcoded secrets found
- [ ] All secrets from environment
- [ ] `.env` in `.gitignore`

### 31. Test Rate Limiting

```bash
# Send multiple requests rapidly
for i in {1..10}; do
  curl -X POST https://your-app.railway.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "test"}'
done
```

- [ ] After limit: 429 Too Many Requests
- [ ] Rate limiting working

### 32. Verify OTP Security

```bash
# Check OTP never appears in logs
# In Railway logs, search for "12345" (test OTP digit)
```

- [ ] OTP never logged
- [ ] Only "[REDACTED]" shown
- [ ] Password never logged
- [ ] Tokens not logged

### 33. Test JWT Expiry

```bash
# Get token, wait until expiry
# Try using expired token
curl -X POST https://your-app.railway.app/api/auth/verify \
  -H "Authorization: Bearer <expired_token>"
```

- [ ] Returns 401 Unauthorized
- [ ] Message: "Invalid or expired token"

## 📚 Documentation Verification

- [ ] README.md complete
- [ ] API_DOCUMENTATION.md complete
- [ ] DEPLOYMENT_GUIDE.md complete
- [ ] ARCHITECTURE.md complete
- [ ] .env.example has all variables

## 🎯 Frontend Integration

### 34. Document API Endpoint

Share with frontend team:
- [ ] Base URL: `https://your-app.railway.app`
- [ ] API docs: See API_DOCUMENTATION.md
- [ ] JWT format: `Authorization: Bearer <token>`
- [ ] Error format: Check error_type field

### 35. Frontend Checklist

- [ ] Registration UI built
- [ ] Login UI built
- [ ] OTP entry form built
- [ ] Countdown timers implemented
- [ ] JWT storage configured
- [ ] API calls use correct endpoints
- [ ] Error handling implemented

## ✨ Final Verification

### 36. Complete Flow Test

1. **Register new user**
   - [ ] Enter email, phone, password
   - [ ] Receive OTP email
   - [ ] Enter OTP
   - [ ] Account created
   - [ ] JWT received

2. **Login with same user**
   - [ ] Enter email, password
   - [ ] Receive OTP email
   - [ ] Enter OTP
   - [ ] JWT received

3. **Use JWT to access protected route** (when implemented)
   - [ ] Send JWT in header
   - [ ] Access granted

### 37. Performance Check

- [ ] Registration: < 5 seconds
- [ ] OTP delivery: < 2 seconds
- [ ] OTP verification: < 1 second
- [ ] Login flow: < 5 seconds total

### 38. Edge Cases

- [ ] Duplicate email registration: Error
- [ ] Invalid email format: Error
- [ ] Weak password: Error
- [ ] Invalid OTP: Error with count
- [ ] Expired OTP: Error
- [ ] Max attempts: Block with countdown
- [ ] Cooldown still active: Error

## 🔄 Post-Deployment

### 39. Monitoring Setup

- [ ] Railway metrics enabled
- [ ] Log alerts configured
- [ ] Error tracking active
- [ ] Daily backup verified

### 40. Documentation & Handoff

- [ ] README updated with production URL
- [ ] API docs shared with team
- [ ] Deployment guide documented
- [ ] Environment variables documented
- [ ] Emergency procedures documented
- [ ] Team trained on API usage

## 🎓 Learning Resources

- [ ] Express.js docs reviewed
- [ ] PostgreSQL docs reviewed
- [ ] JWT best practices understood
- [ ] Bcryptjs hashing understood
- [ ] Railway docs reviewed

## ✅ Sign-Off

- [ ] Backend developer: _______________  Date: _______
- [ ] QA/Tester: ____________________  Date: _______
- [ ] Team Lead: ____________________  Date: _______

## 🚨 Troubleshooting

If something fails:

1. **Check logs**: `Railway Dashboard → Logs`
2. **Verify env vars**: All required variables set?
3. **Test locally**: Does it work in development?
4. **Database**: Can you connect to PostgreSQL?
5. **Email**: Can you send emails via Brevo?
6. **Firewall**: Any port/connection issues?

## 📞 Support

- Railway: https://docs.railway.app/
- Brevo: https://help.brevo.com/
- Node.js: https://nodejs.org/docs/
- PostgreSQL: https://www.postgresql.org/docs/

---

**Total Time Estimate**: 2-4 hours for first-time setup

**Estimated Cost** (Monthly):
- Railway App: $5-20
- PostgreSQL: $10-50
- Brevo: Free tier (up to 300 emails/day)
- **Total**: $15-70/month for small deployment

---

✨ **Congratulations!** Your authentication backend is production-ready! 🎉
