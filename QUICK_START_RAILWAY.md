# Quick Start: Railway Deployment (5 Minutes)

## ✅ Checklist

### 1️⃣ Verify PostgreSQL Service (1 minute)

- [ ] Open Railway Dashboard
- [ ] Look at services list (left sidebar)
- [ ] See "PostgreSQL" service?
  - ✅ Yes → Go to step 2
  - ❌ No → Create it:
    1. Click "Create" or "+" button
    2. Select "PostgreSQL"
    3. Wait for deployment (green status)
    4. Go to step 2

### 2️⃣ Get DATABASE_URL (1 minute)

- [ ] Click PostgreSQL service
- [ ] Go to "Variables" tab
- [ ] Find `DATABASE_URL` variable
- [ ] Copy entire value (starts with `postgresql://`)
- [ ] Save it temporarily (you'll paste it next)

### 3️⃣ Update Backend Variables (2 minutes)

- [ ] Click your backend service (chat-app-auth-backend)
- [ ] Go to "Variables" tab
- [ ] Create/Update these variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Paste from step 2 |
| `JWT_SECRET` | Generate: `openssl rand -hex 32` |
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your Brevo email |
| `SMTP_PASSWORD` | Your Brevo API key |
| `SMTP_FROM_EMAIL` | Your sender email |
| `NODE_ENV` | `production` |

- [ ] Click "Save"
- [ ] Wait for automatic redeploy (2-3 minutes)

### 4️⃣ Verify Deployment (1 minute)

- [ ] Click "Deployments" tab
- [ ] Watch for: `1/1 replicas became healthy`
- [ ] Check logs for:
  ```
  ✅ Server running on port 8080
  ✅ Health endpoint available
  ✅ Database connected successfully
  ✅ Database migrations completed
  ✅ Email service connected
  ```

### 5️⃣ Test the App (1 minute)

```bash
# Test health endpoint
curl https://your-app.railway.app/health

# Response should be:
# {"status":"OK","timestamp":"...","environment":"production"}

# Check diagnostics (shows db status)
curl https://your-app.railway.app/diagnostics
```

---

## ✨ That's It!

If you see ✅ messages in the logs, you're done! 

Your chat app is ready to use:
- ✅ Registration with OTP
- ✅ Login with OTP
- ✅ Chat with encryption
- ✅ Real-time messaging

---

## 🆘 Stuck?

### "Database connection timeout"

→ Check step 1 & 2 (PostgreSQL running? DATABASE_URL set?)

### "Email service failed"

→ Check step 3 (SMTP variables correct?)

### "Environment variables not set"

→ Check step 3 (Variables saved and deployed?)

### Still broken?

Visit `/diagnostics` endpoint:
```bash
curl https://your-app.railway.app/diagnostics
```

It will show you exactly what's wrong! 🎯

---

## 📚 Detailed Guides

- **Full Railway Setup Guide:** `RAILWAY_DATABASE_SETUP.md`
- **Complete Fix Summary:** `COMPLETE_FIX_SUMMARY.md`
- **Environment Variables:** `.env.example`

---

## 🚀 API Endpoints

Once deployed, you can use:

```bash
# Register new user
POST /api/auth/register
Body: {"email": "user@test.com", "phone": "1234567890", "password": "password123"}

# Login
POST /api/auth/login
Body: {"email": "user@test.com", "password": "password123"}

# Verify OTP (for registration or login)
POST /api/auth/register/verify-otp
Body: {"email": "user@test.com", "otp": "1234567890"}

# Create chat
POST /api/chat/create
Headers: {"Authorization": "Bearer YOUR_JWT_TOKEN"}
Body: {"otherUserEmail": "friend@test.com"}

# And more...
```

See `API_DOCUMENTATION.md` for full API reference.

---

## Summary

1. Verify PostgreSQL exists and is running
2. Copy DATABASE_URL from PostgreSQL
3. Set 8 variables in backend service
4. Wait for redeploy
5. Test with /health endpoint
6. Done! ✅

**Estimated time:** 5 minutes ⏱️
