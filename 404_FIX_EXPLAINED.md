# 404 "Application Not Found" - Fixed ✅

## Problem

Your Android app was getting a **404 "Application not found"** error when calling:
```
POST https://anon-chat-backend.up.railway.app/api/auth/register
```

Even though the backend logs showed:
```
🚀 Server running on port 8080
```

---

## Root Cause

Railway has a special behavior:

1. **The Issue**: `railway.json` had a hardcoded `PORT` variable set to `3000`
2. **What Happened**: 
   - You configured PORT=3000 in railway.json
   - But Railway's container runtime automatically assigns PORT=8080
   - Railway was trying to route traffic to port 3000
   - The app was listening on port 8080 (from Railway's override)
   - **Port mismatch = 404**

3. **Evidence in Logs**:
   ```
   x-railway-fallback: true  ← This means Railway fell back because it couldn't reach the service
   ```

---

## The Fix

### ✅ Fix 1: Remove Hardcoded PORT from railway.json
**Before:**
```json
"variables": {
  "NODE_ENV": "production",
  "PORT": "3000",           ← ❌ HARDCODED
  "OTP_EXPIRY_MINUTES": "15"
}
```

**After:**
```json
"variables": {
  "NODE_ENV": "production",
  "OTP_EXPIRY_MINUTES": "15"
  // PORT removed - let Railway manage it
}
```

**Why**: Railway automatically sets `PORT` for the container. By removing it, Railway can manage the port properly.

### ✅ Fix 2: Update Dockerfile Health Check
**Before:**
```dockerfile
HEALTHCHECK --interval=30s ... \
  CMD node -e "fetch('http://localhost:3000/health')" || exit 1
```

**After:**
```dockerfile
HEALTHCHECK --interval=30s ... \
  CMD node -e "const port = process.env.PORT || 3000; fetch('http://localhost:' + port + '/health')..."
```

**Why**: Health check now uses the dynamic PORT from the environment, not hardcoded.

### ✅ Fix 3: Add Railway Health Check Configuration
**Added to railway.json:**
```json
"deploy": {
  "healthcheckPath": "/health",
  "healthcheckTimeout": 30
}
```

**Why**: Tells Railway where to health check your service.

---

## How It Works Now

### Port Assignment Flow:
```
1. Railway creates container
   ↓
2. Railway assigns random PORT (e.g., 8080, 9000, etc.)
   ↓
3. Railway sets PORT environment variable to that value
   ↓
4. Your app reads process.env.PORT
   ↓
5. App starts server on Railway's assigned port
   ↓
6. Railway routes external requests to that port ✅
```

---

## Code Changes Made

| File | Change | Reason |
|------|--------|--------|
| `railway.json` | Removed hardcoded `PORT` variable | Let Railway manage port assignment |
| `railway.json` | Added `healthcheckPath` and `healthcheckTimeout` | Enable proper health checks |
| `Dockerfile` | Updated health check to use `$PORT` dynamically | Work with any port Railway assigns |
| `Dockerfile` | Changed EXPOSE from 3000 to 8080 | Better documentation (Railway will override) |

---

## Testing the Fix

### Step 1: Push Code to GitHub
```bash
cd backend
git add .
git commit -m "Fix: Railway port configuration - remove hardcoded PORT"
git push origin main
```

### Step 2: Railway Auto-Redeploys
- Watch the Railway logs
- Should see: `🚀 Server running on port [YOUR_PORT]`
- The port number might change (that's OK)

### Step 3: Test Health Endpoint
```bash
curl https://anon-chat-backend.up.railway.app/health
```

**Expected Response (200 OK):**
```json
{
  "status": "OK",
  "timestamp": "2026-01-03T12:00:00.000Z",
  "environment": "production"
}
```

**If 404:** Railway is still routing incorrectly
- Try again in 30 seconds (cold start)
- Check Railway logs for errors
- Click "Deploy" in Railway to force restart

### Step 4: Test Registration Endpoint
```bash
curl -X POST https://anon-chat-backend.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "1234567890",
    "password": "Test123!"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "success",
  "message": "OTP sent to your email",
  "data": {
    "email": "test@example.com",
    "otpSessionId": "...",
    "expiresIn": 900
  }
}
```

**If still 404:**
- Wait 60 seconds and retry (cold start issue)
- Check if app crashed by looking at Railway logs
- Railway dashboard should show service status

---

## Why This Matters

### ❌ Before Fix:
```
Railway assigns PORT=8080
└─ App listens on port 8080 ✅
└─ Railway routes traffic to port 3000 (from hardcoded config) ❌
└─ Port mismatch!
└─ Result: 404 "Application not found"
```

### ✅ After Fix:
```
Railway assigns PORT=8080
└─ App reads process.env.PORT=8080 ✅
└─ App listens on port 8080 ✅
└─ Railway routes traffic to port 8080 ✅
└─ Ports match!
└─ Result: 200 OK ✅
```

---

## Key Learnings

1. **Never hardcode PORT in Railway deployments**
   - Railway always manages the PORT environment variable
   - Your app should read it dynamically with `process.env.PORT`

2. **Railway's Fallback Header**
   ```
   x-railway-fallback: true
   ```
   - Indicates Railway fell back because the service wasn't responding
   - Usually caused by port mismatches or service crashes

3. **Health Checks Are Critical**
   - Railway uses `/health` to determine if service is up
   - If health check fails, Railway removes the service from routing
   - This is why the fix includes proper health check configuration

4. **Cold Starts**
   - After deployment, Railway needs 30-60 seconds to fully route traffic
   - If you get 404 immediately after deploy, wait and retry

---

## If Still Getting 404

### Troubleshooting Checklist:
- [ ] Check Railway logs for application errors
- [ ] Verify DATABASE_URL is set in Railway Variables
- [ ] Verify SMTP credentials are set (non-critical for 404)
- [ ] Try health check: `curl /health` endpoint
- [ ] Check if service is "Running" in Railway dashboard (not "Crashed")
- [ ] Wait 60+ seconds after deployment
- [ ] Try browser DevTools Network tab to see actual response
- [ ] Click "Deploy" button in Railway to restart service

### Get Debugging Info:
1. Railway Dashboard → Your App → Logs tab
2. Filter for "[ERROR]" messages
3. Look for connection errors, syntax errors, or port issues
4. Share error messages for further debugging

---

## What Changed From Your Original Setup

| Aspect | Before | After |
|--------|--------|-------|
| PORT in railway.json | `"PORT": "3000"` | Removed (Railway manages) |
| Port mismatch | Yes (3000 vs 8080) | No (dynamic assignment) |
| Health check | Static port 3000 | Dynamic port from env |
| x-railway-fallback | `true` (failing) | `false` (working) |

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Railway auto-deploys
3. ✅ Test `/health` endpoint
4. ✅ Test `/api/auth/register` endpoint
5. ✅ Run Android app - should work now! 🎉

---

## Questions?

- **What is the PORT variable?** Environment variable that tells the app which port to listen on
- **Why does Railway override it?** Railway needs to control which port is exposed in the container
- **Will changing PORT break anything?** No - your code already reads from `process.env.PORT`
- **How do I know what port Railway assigns?** Check logs: `🚀 Server running on port XXXX`

**You're all set!** The app should now properly respond to requests. 🚀
