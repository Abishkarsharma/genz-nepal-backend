const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');

// Get my notifications
router.get('/', protect, async (req, res) => {
  try {
    const notes = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark all as read
router.patch('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark one as read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
