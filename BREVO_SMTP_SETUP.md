# Brevo SMTP Configuration Guide

## Overview
This guide explains how to properly configure Brevo SMTP credentials for the authentication backend.

## Required Environment Variables

```bash
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@example.com
SMTP_PASSWORD=your-brevo-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Your App Name
```

## Step-by-Step Setup

### 1. Log into Brevo Account
- Go to [https://app.brevo.com](https://app.brevo.com)
- Sign in with your Brevo account credentials

### 2. Find SMTP Settings
- Click on **Settings** (⚙️ icon) in the left sidebar
- Click on **SMTP & API**
- You'll see your SMTP configuration

### 3. Get Your SMTP Credentials

The following values are available in Brevo dashboard:

**SMTP Host:**
```
smtp-relay.brevo.com
```

**SMTP Port:**
- **587** (for TLS/STARTTLS) ← **RECOMMENDED**
- **465** (for SSL) ← Alternative
- **25** (for Explicit TLS) ← Avoid, often blocked

**SMTP Login (Username):**
- This is typically the **email address** you registered with Brevo
- Example: `your-email@example.com`

**SMTP Password:**
- This is NOT your account password!
- Generate or copy the **SMTP Password** from the Brevo dashboard
- NOT the API key (API key is different)

### 4. Set Environment Variables

**On Railway (Recommended for Production):**

1. Go to your Railway project dashboard
2. Click on the backend service
3. Go to **Variables** tab
4. Add these variables:

```
SMTP_HOST = smtp-relay.brevo.com
SMTP_PORT = 587
SMTP_USER = your-brevo-email@example.com
SMTP_PASSWORD = your-brevo-smtp-password-here
SMTP_FROM_EMAIL = noreply@yourdomain.com
SMTP_FROM_NAME = Your App Name
```

**Locally (Development):**

Create a `.env` file in the `backend/` directory:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/anonchat
JWT_SECRET=your-secret-key-min-32-characters-long
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-email@example.com
SMTP_PASSWORD=your-brevo-smtp-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=ChatApp
OTP_EXPIRY_MINUTES=10
OTP_RESEND_COOLDOWN_MINUTES=10
OTP_MAX_ATTEMPTS=3
NODE_ENV=development
```

### 5. Test the Connection

**Option A: Start the server (automatic test)**
```bash
npm start
```

The server will test the SMTP connection on startup. If successful:
```
[INFO] ✅ Email service connected
```

If it fails, you'll see:
```
[WARN] ⚠️ Email service connection failed - server will continue but emails may not work
```

**Option B: Manual test with curl (once server is running)**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "1234567890",
    "password": "TestPassword123"
  }'
```

Then check the server logs for the email sending confirmation.

## Common Issues and Solutions

### Issue: "Connection timeout"
**Cause:** SMTP server unreachable  
**Solutions:**
- Verify `SMTP_HOST` is exactly `smtp-relay.brevo.com`
- Check `SMTP_PORT` is 587 (or 465)
- Ensure your network allows outbound connections to Brevo
- Try a different port: 587 or 465

### Issue: "Invalid login credentials"
**Cause:** Wrong username or password  
**Solutions:**
- `SMTP_USER` should be your Brevo email address, not your account password
- `SMTP_PASSWORD` should be the SMTP password from Brevo dashboard, NOT your account password
- Verify both values match exactly (case-sensitive)
- Check for extra spaces at the beginning or end

### Issue: "Authentication failed"
**Cause:** Credentials are incorrect or account not activated  
**Solutions:**
- Verify your Brevo account is active and not suspended
- Check that you've confirmed your email with Brevo
- Re-generate the SMTP password in Brevo dashboard
- Make sure you're not using API key instead of SMTP password

### Issue: "TLS required"
**Cause:** Trying to connect without TLS on port 587  
**Solutions:**
- Port 587 automatically uses STARTTLS (handled by nodemailer)
- No additional configuration needed if using port 587

### Issue: "Sender address rejected"
**Cause:** `SMTP_FROM_EMAIL` is not verified with Brevo  
**Solutions:**
- Go to Brevo dashboard
- Verify the sender email in **Senders** section
- Use an email you've verified with Brevo for `SMTP_FROM_EMAIL`

## Verification Checklist

- [ ] I'm using `smtp-relay.brevo.com` as the host
- [ ] Port is set to 587 or 465
- [ ] SMTP_USER is my Brevo email address
- [ ] SMTP_PASSWORD is the SMTP password (NOT my account password)
- [ ] SMTP_FROM_EMAIL is a verified sender in Brevo
- [ ] Environment variables are set without extra spaces
- [ ] My network allows outbound SMTP connections

## Testing Production Deployment

Once deployed to Railway:

1. Check environment variables in Railway dashboard
2. Look at server logs for connection message
3. Test by triggering a registration OTP via the mobile app
4. Verify email is received

## Additional Resources

- [Brevo SMTP Documentation](https://www.brevo.com/features/smtp/)
- [Brevo API Keys and SMTP](https://help.brevo.com/hc/en-us/articles/209467485-Create-and-manage-your-SMTP-credentials)
- [Nodemailer Documentation](https://nodemailer.com/)

## Support

If emails still aren't working:
1. Check Railway logs for detailed error messages
2. Verify all environment variables are correctly set
3. Try resetting your SMTP password in Brevo
4. Contact Brevo support if the SMTP service is down
