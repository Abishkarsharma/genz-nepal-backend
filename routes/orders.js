const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const Order = require('../models/Order');

// Place order (any logged-in user)
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, paymentStatus, paymentRef, subtotal, shipping } = req.body;
    const tax = Math.round(subtotal * 0.13);
    const total = subtotal + (shipping || 250) + tax;
    const order = await Order.create({
      user: req.user.id,
      items,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentStatus || 'pending',
      paymentRef: paymentRef || '',
      subtotal,
      shipping: shipping || 250,
      tax,
      total,
    });
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user's orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: get all orders
router.get('/all', protect, requireRole('admin'), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update order status
router.patch('/:id/status', protect, requireRole('admin'), async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
