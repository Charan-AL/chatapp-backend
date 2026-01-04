FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Note: Railway assigns ports dynamically via the PORT environment variable
# The app reads PORT from environment, defaulting to 3000 for local development

# Health check - verify the app is listening on the /health endpoint
# Uses a dedicated script with proper error handling
# start-period: Give server 15s to initialize and listen
# timeout: Allow 6s for the healthcheck script to complete
# interval: Check every 10s
# retries: Try 5 times before marking unhealthy
HEALTHCHECK --interval=10s --timeout=6s --start-period=15s --retries=5 \
  CMD node scripts/healthcheck.js

# Start server (migrations run automatically on startup)
CMD npm start
