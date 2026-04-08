const router = require('express').Router();
const Message = require('../models/Message');
const { protect, requireRole } = require('../middleware/auth');

// Send message to seller
router.post('/', protect, async (req, res) => {
  try {
    const { product, seller, message } = req.body;
    if (!product || !seller || !message) {
      return res.status(400).json({ message: 'product, seller, and message are required' });
    }
    const msg = await Message.create({
      product,
      seller,
      sender: req.user.id,
      senderName: req.user.name,
      senderEmail: req.body.senderEmail || '',
      message,
    });
    res.status(201).json({ message: 'Message sent', data: msg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Seller: get messages for own products
router.get('/seller', protect, requireRole('seller', 'admin'), async (req, res) => {
  try {
    const messages = await Message.find({ seller: req.user.id })
      .populate('product', 'name image')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
