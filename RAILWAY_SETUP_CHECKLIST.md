# Railway Setup Checklist - Database Configuration

Your backend is now configured to **automatically create database tables on startup**. Follow this checklist to get it running on Railway.

## Issue You're Experiencing

```
❌ Database connection timeout
❌ Tables not being created
✅ FIXED: Auto-migration now runs on startup
```

---

## Step 1: Verify PostgreSQL Setup in Railway ✅

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Open your project**
3. **Check for PostgreSQL plugin**:
   - [ ] PostgreSQL database service is added
   - [ ] Status shows "Running" (not "Deploying" or "Crashed")

If missing, add it:
- Click **+ Add Service**
- Select **Database**
- Choose **PostgreSQL**
- Click **Deploy**

**Wait 2-3 minutes** for PostgreSQL to fully initialize.

---

## Step 2: Verify DATABASE_URL Environment Variable ✅

1. **In Railway dashboard**, click your **Node.js app**
2. Go to **Variables** tab
3. **Check for `DATABASE_URL`**:
   - Should look like: `postgresql://user:password@host:port/database`
   - If NOT present → Railway didn't auto-connect PostgreSQL

**If missing, link manually:**
1. Click **+ Add Service** → Select your **PostgreSQL database**
2. This auto-creates `DATABASE_URL`

---

## Step 3: Set All Required Environment Variables ✅

In Railway Variables tab, add/verify these exist:

### Database
- [ ] `DATABASE_URL` (auto-set by Railway)

### Server
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3000`

### JWT
- [ ] `JWT_SECRET` = (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] `JWT_EXPIRY` = `7d`

### OTP
- [ ] `OTP_EXPIRY_MINUTES` = `15`
- [ ] `OTP_RESEND_COOLDOWN_MINUTES` = `5`
- [ ] `OTP_MAX_ATTEMPTS` = `3`

### Email (Brevo SMTP)
- [ ] `SMTP_HOST` = `smtp-relay.brevo.com`
- [ ] `SMTP_PORT` = `587`
- [ ] `SMTP_USER` = (your Brevo email)
- [ ] `SMTP_PASSWORD` = (your Brevo API key)
- [ ] `SMTP_FROM_EMAIL` = (verified email in Brevo)
- [ ] `SMTP_FROM_NAME` = `ChatApp`

### App
- [ ] `APP_NAME` = `ChatApp`
- [ ] `APP_URL` = `https://your-app.railway.app` (or custom domain)
- [ ] `LOG_LEVEL` = `info`

---

## Step 4: Deploy & Monitor ✅

1. **Push code** to GitHub:
   ```bash
   cd backend
   git add .
   git commit -m "Fix: Auto-migrate database on startup"
   git push origin main
   ```

2. **Railway auto-deploys** (if configured)

3. **Monitor logs** in Railway:
   ```
   Click Logs tab → Watch for:
   ```

   ✅ **Expected success logs:**
   ```
   [INFO] Validating environment variables...
   [INFO] ✅ Environment variables validated
   [INFO] Testing database connection (attempt 1/3)...
   [INFO] ✅ Database connected successfully
   [INFO] 🔄 Running database migrations...
   [INFO] ✅ Database migrations completed
   [INFO] Testing email service...
   [INFO] ✅ Email service connected
   [INFO] 🚀 Server running on port 3000
   ```

   ❌ **If you see timeout:**
   ```
   [WARN] Database connection attempt 1 failed: Connection terminated due to connection timeout
   ```
   → Go to **Step 5: Troubleshoot Connection**

---

## Step 5: Troubleshoot Connection Timeout 🔧

If still getting connection timeout:

### 5.1 Check PostgreSQL Status
1. In Railway dashboard → PostgreSQL service
2. Check **Status**: Should say "Running"
3. Check **Health**: Should be green

If not running:
- [ ] Click **Deploy** to restart PostgreSQL
- [ ] Wait 3-5 minutes for it to fully start

### 5.2 Verify DATABASE_URL Format
1. Go to **Variables** tab
2. Copy `DATABASE_URL` value
3. Check format: `postgresql://user:password@host:port/database`

If looks wrong (empty, truncated, etc.):
- [ ] Delete `DATABASE_URL` variable
- [ ] Remove app from PostgreSQL plugin
- [ ] Re-add app to PostgreSQL → auto-generates correct `DATABASE_URL`

### 5.3 Increase Connection Timeout
The code already has a generous timeout (15s), but if still failing:

1. Check if PostgreSQL is actually running
2. Wait 5+ minutes after PostgreSQL deployment
3. Try redeploying the app

### 5.4 Check Network/Firewall
Railway services communicate automatically - should not need firewall changes.

If still timeout after all above:
- [ ] Contact Railway support: https://railway.app/support
- [ ] Provide deployment ID from logs

---

## Step 6: Verify Tables Were Created ✅

Once server is running:

### Option 1: Check in Railway Logs
```
[INFO] ✅ Database migrations completed (X statements)
```

### Option 2: Query Database Directly
```bash
# Get PostgreSQL connection string from Railway Variables
DATABASE_URL="postgresql://..."

# Connect and list tables
psql $DATABASE_URL -c "\dt"

# Should show:
#  public | users                    | table
#  public | pending_registrations    | table
#  public | otp_sessions             | table
```

---

## Step 7: Test API Endpoint ✅

Once server is running, test registration endpoint:

```bash
# Replace with your Railway app domain
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "1234567890",
    "password": "TestPass123!"
  }'
```

**Expected response** (no 404, no timeout):
```json
{
  "status": "success",
  "message": "OTP sent to email",
  "data": {
    "email": "test@example.com",
    "otpSessionId": "uuid-here",
    "expiresIn": 900
  }
}
```

If getting **404 - Application not found**:
- Railway app container didn't start successfully
- Check logs for errors
- Verify DATABASE_URL is set before deploying

---

## Quick Reference: Common Issues

| Issue | Solution |
|-------|----------|
| Timeout when starting | Wait for PostgreSQL to fully initialize (3-5 min) |
| DATABASE_URL missing | Manually link PostgreSQL to app in Railway |
| Tables not created | Check logs for migration errors (now auto-runs on startup) |
| 404 from Android app | Backend container crashed - check Railway logs |
| SMTP errors | Verify Brevo credentials in Railway Variables |

---

## What Changed in Your Code

✅ **Automatic database migrations on startup**
- Tables are created automatically when server starts
- No need to manually run `npm run migrate`
- Safe to redeploy multiple times (uses `CREATE TABLE IF NOT EXISTS`)

✅ **Fixed PostgreSQL schema syntax**
- Removed MySQL-style inline `INDEX` declarations
- Now uses proper PostgreSQL `CREATE INDEX` statements

---

## Next Steps

1. **Verify all environment variables are set in Railway**
2. **Push code to GitHub** (already done if using this repo)
3. **Monitor logs** - should see success messages
4. **Test API endpoint** from your Android app
5. **If still having issues** → Go through troubleshooting section

---

## Getting Help

- **Railway Support**: https://railway.app/support
- **Deployment Docs**: https://docs.railway.app/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Node.js Deployment**: https://nodejs.org/en/docs/guides/

---

**Last Updated**: 2026-01-03
**Backend Version**: 1.0.0
