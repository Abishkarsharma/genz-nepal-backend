const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');

// Place order — notify sellers of their products
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, paymentStatus, paymentRef, subtotal, shipping } = req.body;
    const total = subtotal + (shipping || 250);
    const order = await Order.create({
      user: req.user.id,
      items,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentStatus || 'pending',
      paymentRef: paymentRef || '',
      subtotal,
      shipping: shipping || 250,
      tax: 0,
      total,
    });

    // Notify each seller whose product was ordered
    const sellerNotified = new Set();
    for (const item of items) {
      if (!item.product) continue;
      const product = await Product.findById(item.product).select('createdBy name');
      if (!product?.createdBy) continue;
      const sellerId = String(product.createdBy);
      if (sellerNotified.has(sellerId)) continue;
      sellerNotified.add(sellerId);
      await Notification.create({
        recipient: product.createdBy,
        type: 'new_order',
        title: 'New Order Received!',
        body: `${req.user.name} ordered ${item.name} × ${item.quantity} — NPR ${item.price * item.quantity}`,
        orderId: order._id,
      });
    }

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

// Seller: get orders containing their products
router.get('/seller', protect, requireRole('seller', 'admin'), async (req, res) => {
  try {
    // Find all products by this seller
    const myProducts = await Product.find({ createdBy: req.user.id }).select('_id');
    const myProductIds = myProducts.map((p) => String(p._id));

    // Find orders that contain at least one of those products
    const orders = await Order.find({
      'items.product': { $in: myProductIds },
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Filter items to only show this seller's items
    const filtered = orders.map((o) => ({
      ...o.toObject(),
      items: o.items.filter((i) => myProductIds.includes(String(i.product))),
    }));

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Seller: update status of their orders
router.patch('/seller/:id/status', protect, requireRole('seller', 'admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Verify seller owns at least one item in this order
    const myProducts = await Product.find({ createdBy: req.user.id }).select('_id');
    const myProductIds = myProducts.map((p) => String(p._id));
    const hasItem = order.items.some((i) => myProductIds.includes(String(i.product)));
    if (!hasItem && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not your order' });

    order.status = req.body.status;
    await order.save();
    res.json(order);
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
