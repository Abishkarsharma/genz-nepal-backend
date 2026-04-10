const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
require('dotenv').config();

// ── Startup: fail fast if critical env vars are missing ──────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`WARNING: Missing environment variable: ${key}`);
  }
});

const app = express();

// ── Security headers (helmet) ─────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images to load
}));

// ── CORS — only allow your frontend ──────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173', // local dev
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // limit body size

// ── NoSQL injection sanitization ─────────────────────────────────────────────
app.use(mongoSanitize());

// ── Rate limiters ─────────────────────────────────────────────────────────────

// Strict limiter for auth routes (login, signup, OTP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter — prevents scraping and abuse
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Dedicated limiter for uploads — generous but still protected
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { message: 'Too many uploads, please wait a moment' },
});

// Strict limiter for order placement — prevents order spam
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Too many orders placed, please wait a moment' },
});
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/products', generalLimiter, require('./routes/products'));
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/cart', generalLimiter, require('./routes/cart'));
app.use('/api/orders', orderLimiter, require('./routes/orders'));
app.use('/api/admin', generalLimiter, require('./routes/admin'));
app.use('/api/users', generalLimiter, require('./routes/users'));
app.use('/api/reviews', generalLimiter, require('./routes/reviews'));
app.use('/api/messages', generalLimiter, require('./routes/messages'));
app.use('/api/notifications', generalLimiter, require('./routes/notifications'));
app.use('/api/upload', uploadLimiter, require('./routes/upload'));
app.use('/api/esewa', generalLimiter, require('./routes/esewa'));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const Product = require('./models/Product');
  const count = await Product.countDocuments();
  if (count === 0) {
    await Product.insertMany(require('./seed'));
    console.log('Sample products seeded');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (process.env.NODE_ENV !== 'development') require('./keepalive');
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
