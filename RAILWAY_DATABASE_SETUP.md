# Railway PostgreSQL Setup & Troubleshooting

## ⚠️ Error You're Seeing

```
Database query error: Connection terminated due to connection timeout
Max database connection retries reached
Database is not available - app will continue without it
```

This means the backend **cannot reach the PostgreSQL database**. 

---

## ✅ Step 1: Verify PostgreSQL is Running on Railway

1. **Go to Railway Dashboard**
   - Open https://railway.app
   - Select your project
   - Look at the services in the left sidebar

2. **Check for PostgreSQL service**
   - Should see "PostgreSQL" as a service
   - Status should be "Running" (green)
   - If missing, you need to create it (see "Add PostgreSQL" below)

3. **If PostgreSQL is BUILDING or CRASHED**
   - Click on PostgreSQL service
   - Wait for it to finish building
   - Check the deployment logs for errors

---

## ✅ Step 2: Get the PostgreSQL Connection String

1. **Click on your PostgreSQL service**
2. **Go to the Variables tab**
3. **Look for `DATABASE_URL`** (should look like):
   ```
   postgresql://postgres:your_password@containers.railway.internal:5432/railway
   ```

4. **Copy this value** - you'll use it in step 3

---

## ✅ Step 3: Set DATABASE_URL in Your Backend Service

1. **Click on your backend service** (chat-app-auth-backend)
2. **Go to the Variables tab**
3. **Add/Update these variables:**

   | Variable Name | Value |
   |--------------|-------|
   | `DATABASE_URL` | Copy from PostgreSQL service (see Step 2) |
   | `JWT_SECRET` | Generate a random string: `openssl rand -hex 32` |
   | `SMTP_HOST` | `smtp-relay.brevo.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | Your Brevo email address |
   | `SMTP_PASSWORD` | Your Brevo SMTP key |
   | `SMTP_FROM_EMAIL` | Your sender email |
   | `NODE_ENV` | `production` |

4. **Click Save**
5. **Redeploy** - Railway will automatically redeploy with new variables

---

## ✅ Step 4: Verify Connection

After deployment, check the logs:

**✅ Good logs (app is working):**
```
✅ Health endpoint available at /health
✅ Database connected successfully
✅ Email service connected
✅ Database migrations completed
```

**❌ Bad logs (connection failed):**
```
Database query error: Connection terminated due to connection timeout
Max database connection retries reached
```

---

## 🔧 Troubleshooting

### Issue 1: DATABASE_URL is Not Set

**Symptoms:**
```
⚠️  WARNING: DATABASE_URL environment variable is not set!
❌ Database URL validation failed: DATABASE_URL not set
```

**Solution:**
1. Go to your backend service in Railway
2. Click Variables tab
3. Copy DATABASE_URL from PostgreSQL service
4. Paste it in your backend service variables
5. Save and redeploy

---

### Issue 2: Connection Timeout (Can't Reach Database)

**Symptoms:**
```
Database query error: Connection terminated due to connection timeout
Database connection attempt 1 failed: Connection terminated due to connection timeout
```

**Most Common Cause:** PostgreSQL service not set up

**Solution:**
1. Check if PostgreSQL service exists in Railway dashboard
2. If not, add it:
   - Click "Create" or "+" button
   - Select "PostgreSQL"
   - Wait for it to deploy
   - Copy DATABASE_URL (as shown in Step 2)
3. If PostgreSQL exists, check:
   - Is it "Running"? (not Building/Crashed)
   - Click on it and check deployment logs for errors
   - If crashed, delete and recreate the service

---

### Issue 3: Connection Refused (Wrong Host)

**Symptoms:**
```
Database connection error
Cannot connect to database. Verify DATABASE_URL and network connectivity.
```

**Common Cause:** DATABASE_URL points to wrong host

**Solution:**
- Verify DATABASE_URL format:
  ```
  ✅ Correct:    postgresql://user:pass@containers.railway.internal:5432/railway
  ❌ Wrong:      postgresql://localhost:5432/database
  ❌ Wrong:      postgresql://external-host:5432/database (won't work internally)
  ```

- Use `containers.railway.internal` for Railway-to-Railway communication
- Get the correct URL from PostgreSQL service variables

---

### Issue 4: Authentication Failed (Wrong Password)

**Symptoms:**
```
Database connection error
password authentication failed for user "postgres"
```

**Solution:**
1. Go to PostgreSQL service
2. Click Variables tab
3. Look at DATABASE_URL - it contains the correct password
4. Copy the entire URL
5. Paste it in your backend service variables
6. Verify you copied it exactly (including all special characters)

---

### Issue 5: Database Already Exists (From Previous Deploy)

**Symptoms:**
```
Database query error: relation "users" does not exist
```

**First Deploy Only** - This is normal! The migrations create all tables.

**Subsequent Deploys** - If you still see this, it means:
1. Migrations didn't run
2. Check the logs before the migration errors
3. Verify PostgreSQL is accessible

---

## 📋 Quick Checklist

Before deploying, verify:

- [ ] PostgreSQL service exists and is "Running"
- [ ] DATABASE_URL is copied from PostgreSQL service
- [ ] DATABASE_URL is set in backend variables
- [ ] JWT_SECRET is set in backend variables
- [ ] SMTP variables are set (for email)
- [ ] Backend is set to redeploy after changing variables
- [ ] All special characters in passwords are copied correctly

---

## 🧪 Testing the Setup

Once deployed, check logs for:

```javascript
// Expected success messages:
✅ Server running on port 8080
✅ Health endpoint available at /health
✅ Database connected successfully
✅ Database migrations completed
✅ Email service connected
```

Then test the endpoints:

```bash
# Test health (public endpoint)
curl https://your-app.railway.app/health

# Response should be:
{
  "status": "OK",
  "timestamp": "2026-01-04T08:00:00.000Z",
  "environment": "production"
}
```

---

## 📊 Current Status in Your App

The logs show your backend is:
- ✅ Starting successfully
- ✅ Health endpoint working
- ✅ Email service connected
- ❌ Cannot reach database

This means:
1. Your backend code is fine
2. Your Railway PostgreSQL service is either:
   - Not created yet
   - Not running
   - Not accessible with your DATABASE_URL

---

## 🚀 Next Steps

1. **Verify PostgreSQL exists** in your Railway dashboard
2. **Get correct DATABASE_URL** from PostgreSQL variables
3. **Update DATABASE_URL** in your backend variables
4. **Redeploy** the backend
5. **Check logs** for success messages

---

## 📞 Need More Help?

If you still see timeouts after following these steps:

1. **Check PostgreSQL logs**
   - Click PostgreSQL service
   - Click "Logs" tab
   - Look for any error messages

2. **Check backend logs**
   - Click backend service
   - Click "Logs" tab
   - Look for "Database connection attempt" messages

3. **Verify the connection string**
   - Click PostgreSQL service → Variables
   - Copy DATABASE_URL exactly
   - Paste in backend service → Variables
   - Save and redeploy

4. **Try rebuilding**
   - Click backend service
   - Click "Redeploy"
   - Wait for "1/1 replicas became healthy"

---

## Common PostgreSQL Connection Strings

| Service | Format | Example |
|---------|--------|---------|
| Railway | `postgresql://user:pass@containers.railway.internal:5432/db` | `postgresql://postgres:randompass@containers.railway.internal:5432/railway` |
| Heroku | `postgresql://user:pass@host.amazonaws.com:5432/db` | Similar format |
| AWS RDS | `postgresql://user:pass@host.rds.amazonaws.com:5432/db` | Similar format |
| Local Dev | `postgresql://user:pass@localhost:5432/db` | `postgresql://postgres:postgres@localhost:5432/chat_db` |

Railway uses `containers.railway.internal` for internal communication between services.

---

## Summary

Your app is **ready to use**. The only issue is database connectivity. Once you:
1. Add/verify PostgreSQL service on Railway
2. Copy DATABASE_URL to backend variables
3. Redeploy

Everything will work! The migrations will run automatically and your chat app will be fully functional. 🎉
