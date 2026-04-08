const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

const signToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const userPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Input validation
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Invalid email format' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    // Only allow 'user' or 'seller' on self-registration; admin must be set manually
    const safeRole = ['seller'].includes(role) ? role : 'user';
    const user = await User.create({ name, email, password: hashed, role: safeRole });
    res.json({ token: signToken(user), user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    res.json({ token: signToken(user), user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get all users
router.get('/users', protect, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update user role
router.patch('/users/:id/role', protect, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin', 'seller'].includes(role))
      return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// One-time admin setup — creates admin if none exists
router.post('/setup-admin', async (req, res) => {
  try {
    const { email, password, setupKey } = req.body;
    if (setupKey !== process.env.SETUP_KEY) {
      return res.status(403).json({ message: 'Invalid setup key' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      await User.updateOne({ email }, { role: 'admin' });
      return res.json({ message: `${email} upgraded to admin` });
    }
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name: 'Admin', email, password: hashed, role: 'admin' });
    res.json({ message: 'Admin account created' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ message: 'Email and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account with that email' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
