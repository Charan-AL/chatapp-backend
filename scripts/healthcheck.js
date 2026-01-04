#!/usr/bin/env node

/**
 * Healthcheck script for Docker/Railway deployment
 * Tests if the API is responding on the /health endpoint
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const TIMEOUT = 2000; // 2 seconds timeout

const options = {
  hostname: 'localhost',
  port: PORT,
  path: '/health',
  method: 'GET',
  timeout: TIMEOUT,
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Health check passed');
    process.exit(0);
  } else {
    console.error(`❌ Health check failed with status ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('timeout', () => {
  console.error('❌ Health check timeout');
  request.destroy();
  process.exit(1);
});

request.on('error', (error) => {
  console.error(`❌ Health check error: ${error.message}`);
  process.exit(1);
});

request.end();
