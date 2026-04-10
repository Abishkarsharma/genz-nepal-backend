const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');
const { sendOtp } = require('../utils/mailer');

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

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Step 1: Register — send OTP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Invalid email format' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email });
    if (exists && exists.emailVerified)
      return res.status(400).json({ message: 'Email already registered' });

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    const hashed = await bcrypt.hash(password, 10);
    const safeRole = ['seller'].includes(role) ? role : 'user';

    if (exists && !exists.emailVerified) {
      // Resend OTP to pending account
      exists.name = name;
      exists.password = hashed;
      exists.role = safeRole;
      exists.emailOtp = otp;
      exists.emailOtpExpiry = otpExpiry;
      await exists.save();
    } else {
      await User.create({
        name, email, password: hashed, role: safeRole,
        emailOtp: otp, emailOtpExpiry: otpExpiry, emailVerified: false,
      });
    }

    await sendOtp(email, otp);
    res.json({ message: 'OTP sent to your email', requiresVerification: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send verification email. Check server email config.' });
  }
});

// Step 2: Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });
    if (!user.emailOtp || user.emailOtp !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });
    if (user.emailOtpExpiry < new Date())
      return res.status(400).json({ message: 'OTP expired. Please sign up again.' });

    user.emailVerified = true;
    user.emailOtp = '';
    user.emailOtpExpiry = null;
    await user.save();

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

    if (!user.emailVerified)
      return res.status(403).json({ message: 'Please verify your email first', requiresVerification: true, email });

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
