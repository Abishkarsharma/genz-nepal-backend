// Pings the /health endpoint every 14 minutes to prevent Render free tier spin-down
const https = require('https');

const URL = process.env.RENDER_EXTERNAL_URL || 'https://genz-nepal-backend.onrender.com';

function ping() {
  https.get(`${URL}/health`, (res) => {
    console.log(`[keepalive] ${new Date().toISOString()} — status ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[keepalive] ping failed: ${err.message}`);
  });
}

// Ping every 14 minutes (840,000ms)
setInterval(ping, 14 * 60 * 1000);
ping(); // immediate first ping on startup
