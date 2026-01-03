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

# Health check (uses PORT env var, defaults to 3000 for local dev)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3000; fetch('http://localhost:' + port + '/health').then(() => process.exit(0)).catch(() => process.exit(1))" || exit 1

# Start server (migrations run automatically on startup)
CMD npm start
