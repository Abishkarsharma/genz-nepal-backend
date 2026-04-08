const router = require('express').Router();
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
    const { name, email, phone, profilePicture } = req.body;

    // Check if email is taken by another user
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, phone, profilePicture },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
