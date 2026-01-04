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

# Health check - verify the app is listening on the /health endpoint
# Uses a dedicated script with proper error handling
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD node scripts/healthcheck.js

# Start server (migrations run automatically on startup)
CMD npm start
