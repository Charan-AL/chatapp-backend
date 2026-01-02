# Deployment Guide - Railway

Complete step-by-step instructions for deploying the Chat App Authentication Backend to Railway.

## Prerequisites

- ✅ GitHub account with code pushed
- ✅ Railway account (https://railway.app/)
- ✅ Brevo account with SMTP credentials
- ✅ PostgreSQL database (Railway provides this)

## Step 1: Prepare Your Code

### 1.1 Verify Backend Folder Structure

Ensure your GitHub repository has:
```
backend/
├── src/
├── scripts/
├── package.json
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── railway.json
└── README.md
```

### 1.2 Push Code to GitHub

```bash
cd backend
git add .
git commit -m "Add production-grade authentication backend"
git push origin main
```

## Step 2: Create Railway Project

### 2.1 New Project

1. Go to https://railway.app/
2. Click **New Project**
3. Select **Deploy from GitHub**
4. Choose your repository
5. Select the backend folder (if monorepo)

### 2.2 Connect GitHub

1. Authorize Railway to access GitHub
2. Select your repository
3. Configure deployment settings:
   - **Root Directory**: `backend/` (if monorepo)
   - **Auto-deploy from main**: Enable

## Step 3: Add PostgreSQL Database

### 3.1 Add Plugin

1. In Railway project, click **Add Services**
2. Select **Database**
3. Choose **PostgreSQL**
4. Confirm and deploy

### 3.2 Automatic Connection

Railway automatically:
- Creates PostgreSQL instance
- Sets `DATABASE_URL` environment variable
- Provisions credentials

Your backend will auto-connect via `process.env.DATABASE_URL`

## Step 4: Configure Environment Variables

### 4.1 Set Required Variables

In Railway project dashboard:

1. **Click your app** → **Variables**
2. **Add new variable** for each:

```
NODE_ENV=production
PORT=3000

JWT_SECRET=generate_a_secure_key_here
JWT_EXPIRY=7d

OTP_EXPIRY_MINUTES=15
OTP_RESEND_COOLDOWN_MINUTES=5
OTP_MAX_ATTEMPTS=3

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_email@example.com
SMTP_PASSWORD=your_brevo_smtp_key
SMTP_FROM_EMAIL=noreply@yourchatapp.com
SMTP_FROM_NAME=ChatApp

APP_NAME=ChatApp
APP_URL=https://your-app-domain.railway.app
LOG_LEVEL=info
```

### 4.2 Generate Secure JWT Secret

```bash
# Generate a secure random key (run locally)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output to `JWT_SECRET` in Railway.

### 4.3 Get Brevo SMTP Credentials

1. Go to https://www.brevo.com/
2. Login to dashboard
3. **SMTP & API** → **SMTP Credentials**
4. Copy:
   - **SMTP Login** → `SMTP_USER`
   - **SMTP Password** (API Key) → `SMTP_PASSWORD`

## Step 5: Deploy

### 5.1 Manual Deploy

```bash
# From your local machine
git push origin main
```

Railway auto-deploys on push (if configured).

### 5.2 Trigger Deployment in Railway

Alternatively, in Railway dashboard:
1. Click **Deploy**
2. Select branch (main)
3. Click **Deploy Branch**

### 5.3 Monitor Logs

1. In Railway, click **Logs**
2. Watch for:
   - "✅ Database connected"
   - "✅ Email service connected"
   - "🚀 Server running on port"

## Step 6: Verify Deployment

### 6.1 Health Check

```bash
# Replace with your Railway domain
curl https://your-app.railway.app/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "environment": "production"
}
```

### 6.2 Test Authentication Flow

```bash
# Registration
curl -X POST https://your-app.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "1234567890",
    "password": "TestPass123!"
  }'
```

Should return OTP details (no error).

## Step 7: Domain Configuration (Optional)

### 7.1 Add Custom Domain

1. In Railway project → **Settings**
2. **Domains** → **Add Domain**
3. Enter your domain: `api.yourchatapp.com`
4. Follow DNS configuration instructions
5. Wait for SSL certificate (auto-generated)

### 7.2 Update API_URL

Update `APP_URL` environment variable:
```
APP_URL=https://api.yourchatapp.com
```

## Step 8: Monitoring & Maintenance

### 8.1 Enable Monitoring

1. Railway dashboard → **Metrics**
2. Monitor:
   - CPU usage
   - Memory usage
   - Network I/O
   - Logs for errors

### 8.2 View Logs

```bash
# In Railway dashboard
Logs → Filter by level/service
```

### 8.3 Auto-Restart on Failure

Already configured in `railway.json`:
```json
"restartPolicyMaxRetries": 5
```

## Step 9: Backup & Recovery

### 9.1 Database Backups

Railway PostgreSQL includes:
- Automatic daily backups
- Point-in-time recovery
- Replication to backup server

Access in: **Database** → **Backups**

### 9.2 Manual Backup

```bash
# Connect to PostgreSQL
DATABASE_URL=$(railway link postgresql)
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

## Step 10: Scaling

### 10.1 Increase Memory/CPU

1. Railway dashboard → **App** → **Settings**
2. **Plan** → Choose higher tier
3. Auto-scales to new configuration

### 10.2 Multiple Instances

Railway handles auto-scaling; no additional config needed.

## Troubleshooting

### 🔴 Build Failed

**Check logs:**
```
Railways → Logs → Filter by "ERROR"
```

**Common causes:**
- Missing environment variable
- Dependency not installed
- Invalid Node.js syntax

**Fix:**
1. Check `src/server.js` syntax
2. Verify all dependencies in `package.json`
3. Ensure `.env.example` has all variables

### 🔴 Database Connection Failed

**Verify:**
1. PostgreSQL plugin is added
2. `DATABASE_URL` is set automatically
3. Connection string format:
   ```
   postgresql://user:password@host:port/database
   ```

**Test connection:**
```bash
psql $DATABASE_URL -c "SELECT NOW();"
```

### 🔴 Email Sending Failed

**Verify:**
1. Brevo SMTP credentials are correct
2. Email address is verified in Brevo
3. Brevo account has outbound email enabled

**Test SMTP:**
```bash
telnet smtp-relay.brevo.com 587
# Should connect (type: QUIT to exit)
```

### 🔴 OTP Not Arriving

**Common issues:**
1. Check spam/junk folder
2. Verify `SMTP_FROM_EMAIL` is set
3. Check `SMTP_USER` is correct
4. Ensure Brevo account is verified

**Debug:**
1. Check Railway logs for email service errors
2. Verify OTP session was created (check DB)
3. Test email service directly:
   ```
   Railway Logs → Filter "OTP email sent"
   ```

### 🔴 High Memory Usage

**Check:**
1. Database connection pool size (max: 20 in code)
2. Active sessions in logs
3. Memory leaks in logging

**Solutions:**
1. Upgrade Railway plan
2. Enable caching
3. Optimize queries

### 🔴 Rate Limiting Too Strict

**If users getting "Too many requests":**

1. Check `rateLimiter.js` settings:
   ```javascript
   // auth: 5 requests/minute
   // otp: 3 requests/5 minutes
   ```
2. Increase limits if needed
3. Redeploy

## Production Checklist

Before going live:

- [ ] Environment variables all set
- [ ] Database backups configured
- [ ] SSL/TLS enabled (auto on Railway)
- [ ] Monitoring enabled
- [ ] Logs reviewed for errors
- [ ] Email service tested
- [ ] JWT secret is strong (32+ chars)
- [ ] OTP settings configured (minutes, attempts)
- [ ] Rate limiting acceptable
- [ ] CORS origins set correctly
- [ ] Database indexes verified
- [ ] Disaster recovery plan in place

## Scaling Notes

**Single Instance is fine for:**
- < 1,000 concurrent users
- < 10,000 requests/minute
- < 100 OTPs/minute

**When to scale:**
- 1,000+ concurrent users → add more Railway instances
- 100+ OTPs/minute → increase email service capacity
- Growing storage → upgrade PostgreSQL plan

**Railway Auto-Scaling:**
- CPU: Automatically handled
- Memory: Upgrade plan as needed
- Database: Manual upgrade to larger plan

## Cost Optimization

**Railway Pricing (as of 2024):**
- Node.js app: Pay-as-you-go (~$5-20/month for small apps)
- PostgreSQL: $10-50/month depending on size
- No upfront costs

**Reduce costs:**
1. Clean up expired OTP sessions regularly
2. Archive old logs
3. Use Railway's shared database (if acceptable)
4. Monitor resource usage

## Getting Help

**Railway Support:**
- Dashboard → Help → Contact Support
- Community: https://discord.gg/railway

**Issues:**
1. Check Railway status: https://status.railway.app/
2. Review docs: https://docs.railway.app/
3. Contact Railway support with deployment ID

## Next Steps

1. ✅ Deploy to Railway (follow this guide)
2. ⏭️ Deploy Android app, configure API endpoint
3. ⏭️ Add additional routes (messaging, profiles)
4. ⏭️ Setup CI/CD pipeline for automated testing
5. ⏭️ Monitor performance and scale as needed
