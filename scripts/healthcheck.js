#!/usr/bin/env node

/**
 * Healthcheck script for Docker/Railway deployment
 * Tests if the API is responding on the /health endpoint
 * Uses ES modules to match project configuration
 */

import http from 'http';

const PORT = process.env.PORT || 3000;
const TIMEOUT = 4000; // 4 second timeout for HTTP request

const options = {
  hostname: 'localhost',
  port: PORT,
  path: '/health',
  method: 'GET',
  timeout: TIMEOUT,
};

let isTimedOut = false;

const request = http.request(options, (res) => {
  if (isTimedOut) return; // Ignore response if already timed out

  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Health check passed');
      process.exit(0);
    } else {
      console.error(`Health check failed: HTTP ${res.statusCode}`);
      process.exit(1);
    }
  });
});

request.on('timeout', () => {
  isTimedOut = true;
  console.error('Health check timeout');
  request.destroy();
  process.exit(1);
});

request.on('error', (error) => {
  if (isTimedOut) return; // Don't handle error if already timed out
  console.error(`Health check error: ${error.code || error.message}`);
  process.exit(1);
});

request.end();
