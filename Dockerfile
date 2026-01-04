FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Expose port (Railway will assign the actual port via PORT env var)
EXPOSE 8080

# Health check - simply check if the app is listening
# We use a simple node script to test the /health endpoint
# Server starts immediately, so we only need 2s start-period
HEALTHCHECK --interval=10s --timeout=3s --start-period=2s --retries=5 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health', { timeout: 2000 }).then(() => process.exit(0)).catch(() => process.exit(1))"

# Start server (migrations run automatically on startup)
CMD npm start
