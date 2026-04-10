const router = require('express').Router();
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const { sendOrderConfirmation } = require('../utils/orderEmail');
const User = require('../models/User');

// Generate eSewa v2 signature
function generateEsewaSignature(message, secret) {
  return crypto.createHmac('sha256', secret).update(message).digest('base64');
}

// POST /api/esewa/initiate — create pending order + return signed form data
router.post('/initiate', protect, async (req, res) => {
  try {
    const { items, shippingAddress, subtotal, shipping } = req.body;
    const total = subtotal + (shipping || 250);

    // Validate stock
    for (const item of items) {
      if (!item.product) continue;
      const product = await Product.findById(item.product).select('stock name');
      if (!product) return res.status(404).json({ message: `Product not found: ${item.name}` });
      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Only ${product.stock} unit(s) of "${product.name}" available.`,
        });
      }
    }

    // Create pending order
    const order = await Order.create({
      user: req.user.id,
      items,
      shippingAddress,
      paymentMethod: 'eSewa',
      paymentStatus: 'pending',
      subtotal,
      shipping: shipping || 250,
      tax: 0,
      total,
    });

    // Deduct stock
    for (const item of items) {
      if (!item.product) continue;
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // Build eSewa v2 signature
    const merchantCode = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
    const secretKey = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';
    const signedFields = `total_amount=${total},transaction_uuid=${order._id},product_code=${merchantCode}`;
    const signature = generateEsewaSignature(signedFields, secretKey);

    res.json({
      orderId: order._id,
      formData: {
        amount: subtotal,
        tax_amount: 0,
        total_amount: total,
        transaction_uuid: String(order._id),
        product_code: merchantCode,
        product_service_charge: 0,
        product_delivery_charge: shipping || 250,
        success_url: `${process.env.FRONTEND_URL}/payment-success`,
        failure_url: `${process.env.FRONTEND_URL}/checkout`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature,
      },
      esewaUrl: process.env.ESEWA_ENV === 'production'
        ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
        : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/esewa/verify — called after eSewa redirects back
router.post('/verify', protect, async (req, res) => {
  try {
    const { data } = req.body; // base64 encoded response from eSewa
    if (!data) return res.status(400).json({ message: 'No data received from eSewa' });

    const decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
    const { transaction_uuid, status, total_amount } = decoded;

    if (status !== 'COMPLETE') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    const order = await Order.findByIdAndUpdate(
      transaction_uuid,
      { paymentStatus: 'paid', paymentRef: decoded.transaction_code || data },
      { new: true }
    );

    // Send confirmation email
    const customer = await User.findById(req.user.id).select('email name');
    if (customer?.email) {
      sendOrderConfirmation(order, customer.email, customer.name).catch(() => {});
    }

    // Notify sellers
    const sellerNotified = new Set();
    for (const item of order.items) {
      if (!item.product) continue;
      const product = await Product.findById(item.product).select('createdBy');
      if (!product?.createdBy) continue;
      const sid = String(product.createdBy);
      if (sellerNotified.has(sid)) continue;
      sellerNotified.add(sid);
      await Notification.create({
        recipient: product.createdBy,
        type: 'new_order',
        title: 'New Order Received!',
        body: `${req.user.name} paid via eSewa — NPR ${total_amount}`,
        orderId: order._id,
      });
    }

    res.json({ success: true, orderId: order._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
