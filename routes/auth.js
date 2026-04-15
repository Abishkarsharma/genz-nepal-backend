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

// Signup — direct, no OTP (email verification removed due to SMTP restrictions)
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Invalid email format' });
    if (!email.toLowerCase().endsWith('@gmail.com'))
      return res.status(400).json({ message: 'Only Gmail addresses (@gmail.com) are accepted' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email });
    if (exists && exists.emailVerified)
      return res.status(400).json({ message: 'Email already registered. Please sign in.' });

    const hashed = await bcrypt.hash(password, 10);
    const safeRole = ['seller'].includes(role) ? role : 'user';

    let user;
    if (exists) {
      exists.name = name;
      exists.password = hashed;
      exists.role = safeRole;
      exists.emailVerified = true;
      await exists.save();
      user = exists;
    } else {
      user = await User.create({
        name, email, password: hashed, role: safeRole, emailVerified: true,
      });
    }

    res.json({ token: signToken(user), user: userPayload(user) });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Signup failed. Please try again.' });
  }
});

// Keep verify-otp endpoint for backward compatibility (always succeeds now)
router.post('/verify-otp', async (req, res) => {
  res.status(400).json({ message: 'OTP verification is not required. Please sign up again.' });
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

    // Auto-verify old accounts
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

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

// One-time admin setup
router.post('/setup-admin', async (req, res) => {
  try {
    const { email, password, setupKey } = req.body;
    if (setupKey !== process.env.SETUP_KEY)
      return res.status(403).json({ message: 'Invalid setup key' });
    const existing = await User.findOne({ email });
    if (existing) {
      await User.updateOne({ email }, { role: 'admin', emailVerified: true });
      return res.json({ message: `${email} upgraded to admin` });
    }
    const hashed = await bcrypt.hash(password, 10);
    await User.create({ name: 'Admin', email, password: hashed, role: 'admin', emailVerified: true });
    res.json({ message: 'Admin account created' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot password — direct reset (no OTP)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: 'If that email exists, a reset link was sent' });
    // Return a temp token for password reset
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ message: 'Reset token generated', resetToken, requiresOtp: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword)
      return res.status(400).json({ message: 'Token and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'Account not found' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Invalid or expired reset token' });
  }
});

module.exports = router;
