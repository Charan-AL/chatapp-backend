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

# Install curl for healthcheck
RUN apk add --no-cache curl

# Health check (uses PORT env var, defaults to 3000 for local dev)
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start server (migrations run automatically on startup)
CMD npm start
