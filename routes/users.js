const router = require('express').Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get own profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update own profile
router.put('/me', protect, async (req, res) => {
  try {
    const { name, email, phone, profilePicture, address, city } = req.body;

    if (!name || name.trim().length < 2)
      return res.status(400).json({ message: 'Name must be at least 2 characters' });

    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim(), email, phone, profilePicture, address, city },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change password
router.put('/me/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both current and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
