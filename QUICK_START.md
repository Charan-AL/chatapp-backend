# Quick Start Guide (5 Minutes)

Get the backend running in 5 minutes!

## 1️⃣ Install & Setup (2 min)

```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Brevo credentials:
# SMTP_USER=your_brevo_email@example.com
# SMTP_PASSWORD=your_brevo_api_key
# JWT_SECRET=your_random_secret_key
```

## 2️⃣ Database (1 min)

**Option A: Docker Compose (Recommended)**
```bash
docker-compose up --build
```

**Option B: Local PostgreSQL**
```bash
createdb chat_auth_db
export DATABASE_URL="postgresql://localhost:5432/chat_auth_db"
npm run migrate
```

## 3️⃣ Start Server (1 min)

```bash
npm run dev
```

You should see:
```
✅ Database connected
✅ Email service connected
🚀 Server running on port 3000
```

## 4️⃣ Test It! (1 min)

```bash
# Health check
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@example.com",
    "phone": "1234567890",
    "password": "TestPass123!"
  }'
```

Check your email for OTP! ✉️

---

## 📚 Next Steps

1. **Read API docs**: `API_DOCUMENTATION.md`
2. **Understand architecture**: `ARCHITECTURE.md`
3. **Deploy to Railway**: `DEPLOYMENT_GUIDE.md`
4. **Complete checklist**: `SETUP_CHECKLIST.md`

---

## 🆘 Common Issues

**"Database connection failed"**
```bash
# Check PostgreSQL is running
psql $DATABASE_URL -c "SELECT NOW();"
```

**"Email service failed"**
```bash
# Verify Brevo credentials in .env
telnet smtp-relay.brevo.com 587
```

**"Port 3000 already in use"**
```bash
export PORT=3001
npm run dev
```

---

## 🚀 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/register/verify-otp` | Verify registration OTP |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/login/verify-otp` | Verify login OTP |
| POST | `/api/auth/resend-otp` | Resend OTP |
| GET | `/api/auth/otp-status` | Get OTP session status |
| POST | `/api/auth/verify` | Verify JWT token |

---

## 📦 Project Structure

```
backend/
├── src/
│   ├── config/          # Database, app config
│   ├── modules/         # Auth, OTP, Email, Users
│   ├── routes/          # API routes
│   ├── middlewares/     # Error, rate limit, validation
│   ├── utils/           # Hash, crypto, logger
│   ├── database/        # SQL schema
│   ├── app.js           # Express setup
│   └── server.js        # Server entry
├── scripts/
│   └── migrate.js       # Run migrations
├── package.json
├── .env.example
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🔑 Key Files to Know

| File | Purpose |
|------|---------|
| `src/modules/auth/authService.js` | Main auth logic |
| `src/modules/otp/otpService.js` | OTP handling with cooldown |
| `src/modules/email/emailService.js` | Brevo SMTP |
| `src/modules/users/userService.js` | User CRUD |
| `src/middlewares/rateLimiter.js` | Rate limiting rules |
| `src/config/database.js` | PostgreSQL connection |

---

## 🔐 Security Features

✅ Password hashing (bcryptjs)
✅ OTP hashing before storage
✅ JWT authentication
✅ Rate limiting on endpoints
✅ OTP attempt counting
✅ Automatic cooldown after max attempts
✅ No sensitive data logged

---

## 📊 Environment Variables

```env
# Database (auto on Railway)
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=your_key_here
JWT_EXPIRY=7d

# OTP
OTP_EXPIRY_MINUTES=15
OTP_RESEND_COOLDOWN_MINUTES=5
OTP_MAX_ATTEMPTS=3

# Email (Brevo)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_email@brevo.com
SMTP_PASSWORD=your_api_key
SMTP_FROM_EMAIL=noreply@app.com

# Server
NODE_ENV=development
PORT=3000
```

---

## 🧪 Quick Test Flow

```bash
# 1. Register
EMAIL="test$(date +%s)@example.com"
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"phone\": \"1234567890\",
    \"password\": \"SecurePass123!\"
  }"

# 2. Check email for OTP (replace with your email)
# Open email and copy the OTP

# 3. Verify OTP
curl -X POST http://localhost:3000/api/auth/register/verify-otp \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"otp\": \"YOUR_OTP_HERE\"
  }"

# 4. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"SecurePass123!\"
  }"

# 5. Verify login OTP (check email again)
curl -X POST http://localhost:3000/api/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"otp\": \"YOUR_NEW_OTP_HERE\"
  }"
```

---

## 🐛 Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run dev

# This shows detailed logs without exposing secrets
```

---

## 📱 Frontend Integration

```javascript
// Register
const register = async (email, phone, password) => {
  const res = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone, password })
  });
  return res.json();
};

// Verify OTP
const verifyOtp = async (email, otp) => {
  const res = await fetch('http://localhost:3000/api/auth/register/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  return res.json();
};

// Login
const login = async (email, password) => {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
};

// Use JWT
const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };
  
  return fetch(url, { ...options, headers });
};
```

---

## 🚀 Deploy to Railway

```bash
# 1. Push code
git push origin main

# 2. Railway auto-deploys

# 3. Set env vars in Railway dashboard

# 4. Visit your Railway domain
curl https://your-app.railway.app/health
```

See `DEPLOYMENT_GUIDE.md` for detailed steps.

---

## 📞 Need Help?

- 📖 **Full README**: `README.md`
- 🔌 **API Docs**: `API_DOCUMENTATION.md`
- 🏗️ **Architecture**: `ARCHITECTURE.md`
- 📋 **Checklist**: `SETUP_CHECKLIST.md`
- 🚢 **Deploy**: `DEPLOYMENT_GUIDE.md`

---

## ✨ You're Ready!

Your authentication backend is running! 🎉

Next: Integrate with your Android/web frontend using the API endpoints above.

---

**Happy coding!** 🚀
