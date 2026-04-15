const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const { sendOrderConfirmation } = require('../utils/orderEmail');
const User = require('../models/User');

// ── eSewa payment verification ────────────────────────────────────────────────
// After eSewa redirects back, verify the payment server-side
router.post('/verify-esewa', protect, async (req, res) => {
  try {
    const { token: esewaToken, amount, orderId } = req.body;

    // eSewa verification API (test environment)
    const verifyUrl = process.env.ESEWA_ENV === 'production'
      ? 'https://esewa.com.np/api/epay/transaction/status/'
      : 'https://rc-epay.esewa.com.np/api/epay/transaction/status/';

    const params = new URLSearchParams({
      amt: amount,
      scd: process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST',
      rid: esewaToken,
      pid: orderId,
    });

    const response = await fetch(`${verifyUrl}?${params}`);
    const text = await response.text();

    if (text.includes('<response>Success</response>')) {
      // Mark order as paid
      const order = await Order.findByIdAndUpdate(
        orderId,
        { paymentStatus: 'paid', paymentRef: esewaToken },
        { new: true }
      );
      return res.json({ success: true, order });
    }

    res.status(400).json({ success: false, message: 'eSewa payment verification failed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Khalti payment verification ───────────────────────────────────────────────
router.post('/verify-khalti', protect, async (req, res) => {
  try {
    const { token: khaltiToken, amount, orderId } = req.body;

    const verifyUrl = process.env.KHALTI_ENV === 'production'
      ? 'https://khalti.com/api/v2/payment/verify/'
      : 'https://dev.khalti.com/api/v2/payment/verify/';

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: khaltiToken, amount }), // amount in paisa
    });

    const data = await response.json();

    if (response.ok && data.idx) {
      const order = await Order.findByIdAndUpdate(
        orderId,
        { paymentStatus: 'paid', paymentRef: data.idx },
        { new: true }
      );
      return res.json({ success: true, order });
    }

    res.status(400).json({ success: false, message: data.detail || 'Khalti verification failed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Place order — validate stock, notify sellers
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, paymentStatus, paymentRef, subtotal, shipping } = req.body;

    // Validate stock for every item before creating order
    for (const item of items) {
      if (!item.product) continue;
      const product = await Product.findById(item.product).select('stock name');
      if (!product) return res.status(404).json({ message: `Product not found: ${item.name}` });
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Only ${product.stock} unit${product.stock !== 1 ? 's' : ''} of "${product.name}" available. Please update your cart.`,
        });
      }
    }

    const total = subtotal + (shipping || 80);
    const order = await Order.create({
      user: req.user.id,
      items,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentStatus || 'pending',
      paymentRef: paymentRef || '',
      subtotal,
      shipping: shipping || 80,
      tax: 0,
      total,
    });

    // Deduct stock for each item
    for (const item of items) {
      if (!item.product) continue;
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

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

    // Send order confirmation email to customer (non-blocking)
    const customer = await User.findById(req.user.id).select('email name');
    if (customer?.email) {
      sendOrderConfirmation(order, customer.email, customer.name).catch((err) =>
        console.error('Order email failed:', err.message)
      );
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Customer: cancel their own order (only if pending or processing)
router.patch('/cancel/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel an order that is already ${order.status}` });
    }

    // Restore stock for each item
    for (const item of order.items) {
      if (!item.product) continue;
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    order.status = 'cancelled';
    await order.save();
    res.json({ message: 'Order cancelled successfully', order });
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
