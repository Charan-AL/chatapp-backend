# Railway Deployment - Healthcheck Fix Guide

## Problem Summary
Your backend was failing the `/health` healthcheck on Railway, preventing the service from becoming healthy.

```
Healthcheck failed!
Path: /health
1/1 replicas never became healthy!
```

## Root Causes (FIXED)

### 1. ✅ Syntax Errors - FIXED
- **File**: `backend/src/config/database.js`
  - **Issue**: Duplicate import statement `import pg from 'pg'`
  - **Status**: FIXED

- **File**: `backend/src/modules/auth/authController.js`
  - **Issue**: Duplicate import statement `import * as authService from './authService.js'`
  - **Status**: FIXED

These syntax errors prevented the Node.js modules from loading, causing the app to fail during startup before it could bind to the PORT and respond to healthchecks.

### 2. ⚠️ Missing Environment Variables - ACTION REQUIRED
Railway needs these variables configured for the app to function:

**CRITICAL (required for app to start):**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 characters)

**RECOMMENDED (required for chat/auth functionality):**
- `SMTP_HOST` - Email relay host (e.g., smtp-relay.brevo.com)
- `SMTP_PORT` - Email relay port (e.g., 587)
- `SMTP_USER` - Email relay username
- `SMTP_PASSWORD` - Email relay API key/password
- `SMTP_FROM_EMAIL` - Sender email address

**OPTIONAL (has defaults if not set):**
- `NODE_ENV` - Defaults to 'development'
- `PORT` - Railway assigns this automatically
- `OTP_EXPIRY_MINUTES` - Defaults to 15
- `OTP_RESEND_COOLDOWN_MINUTES` - Defaults to 5
- `OTP_MAX_ATTEMPTS` - Defaults to 3
- `LOG_LEVEL` - Defaults to 'info'

## How the Healthcheck Works

### Express Health Endpoint
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: appConfig.env,
  });
});
```

### Railway Healthcheck Script
Location: `backend/scripts/healthcheck.js`

- **Interval**: 10 seconds
- **Start Period**: 15 seconds (time to startup)
- **Timeout**: 6 seconds per check
- **Retries**: 5 attempts before marking unhealthy
- **Test**: `GET http://localhost:PORT/health`

### Startup Sequence
1. **Server starts immediately** (Express binds to PORT)
2. **Health endpoint available immediately** (returns 200 OK)
3. **Background tasks** (database, migrations, email - non-blocking)
4. **Services become ready** (after background tasks complete)

**This is intentional**: The app doesn't wait for database/email to respond for the health endpoint. The healthcheck only verifies the server is listening, not that it's fully operational.

## Steps to Fix Railway Deployment

### Step 1: Deploy the Fixed Code
```bash
# The syntax fixes are already in your codebase
# Push to your Git remote using the Railway UI button
```

### Step 2: Configure Environment Variables on Railway

1. Go to your Railway dashboard
2. Click on your **backend service**
3. Go to the **Variables** section
4. Add these variables:

```
DATABASE_URL=postgresql://user:password@railway.railway.internal:5432/chatdb
JWT_SECRET=[Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_email@example.com
SMTP_PASSWORD=your_brevo_api_key
SMTP_FROM_EMAIL=noreply@yourapp.com
NODE_ENV=production
```

### Step 3: Verify Database Service
- Check that your PostgreSQL database on Railway is **running**
- Copy the `DATABASE_URL` from your database service variables
- Ensure it's not empty

### Step 4: Deploy and Monitor

1. **Push code** → Railway auto-detects and builds
2. **Monitor deployment** → Watch the logs in Railway dashboard
3. **Check healthcheck** → Should see "1/1 replicas became healthy"

### Step 5: Verify App is Working

```bash
# Test the health endpoint (replace with your Railway URL)
curl https://your-app.railway.app/health

# Expected response:
# {
#   "status": "OK",
#   "timestamp": "2024-01-04T...",
#   "environment": "production"
# }
```

## Debugging Tips

### If Healthcheck Still Fails

1. **Check Deployment Logs**
   - Go to Deployments tab
   - View logs for the failed deployment
   - Look for "Error", "failed", or "cannot find"

2. **Common Issues**

   | Error | Cause | Solution |
   |-------|-------|----------|
   | `ECONNREFUSED` | App not binding to PORT | Check PORT env var, restart deployment |
   | `DATABASE_URL is not set` | Missing env variable | Add DATABASE_URL to Railway variables |
   | `SyntaxError: Unexpected token` | Import errors in code | Run `npm run dev` locally to test |
   | `Cannot find module` | Missing dependency | Check `package.json`, run `npm install` |
   | `timeout` | App taking >15s to start | Check database logs, increase start-period |

3. **Local Testing**
   ```bash
   cd backend
   npm install
   
   # Set env variables
   export DATABASE_URL="postgresql://localhost:5432/chatdb"
   export JWT_SECRET="test-secret-key-32-characters-long"
   
   # Run and test health endpoint
   npm run dev
   curl http://localhost:3000/health
   ```

## Health Endpoint Improvements

The health endpoint can be extended to check dependencies:

```javascript
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: 'checking...',
      email: 'checking...'
    }
  };
  
  try {
    // Check database
    await query('SELECT NOW()');
    health.services.database = 'OK';
  } catch (error) {
    health.services.database = `FAILED: ${error.message}`;
    health.status = 'DEGRADED';
  }
  
  res.status(health.status === 'OK' ? 200 : 503).json(health);
});
```

## Reference Files

- `.env.example` - Complete environment variable reference
- `scripts/healthcheck.js` - Healthcheck implementation
- `src/app.js` - Express app and health endpoint
- `src/server.js` - Startup logic with non-blocking background tasks

## Summary

✅ **Fixed Code Issues**: Duplicate imports removed
⏳ **Action Required**: Set environment variables on Railway
✅ **Expected Result**: Health check passes, service becomes healthy

Once you set the environment variables and redeploy, the healthcheck should pass within 15 seconds!
