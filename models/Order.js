const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: String,
      price: Number,
      quantity: Number,
      image: String,
    },
  ],
  shippingAddress: {
    fullName: String,
    phone: String,
    email: String,
    province: String,
    city: String,
    district: String,
    area: String,
    street: String,
    landmark: String,
    postalCode: String,
  },
  paymentMethod: {
    type: String,
    enum: ['Cash on Delivery', 'Card / Wallet', 'eSewa', 'Khalti', 'Bank Transfer'],
    default: 'Cash on Delivery',
  },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paymentRef: { type: String, default: '' },
  subtotal: Number,
  shipping: { type: Number, default: 250 },
  total: Number,
  status: { type: String, default: 'pending' },
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });           // my orders page
orderSchema.index({ 'items.product': 1 });               // seller orders lookup
orderSchema.index({ status: 1, createdAt: -1 });         // admin filter by status
orderSchema.index({ createdAt: -1 });                    // admin all orders sorted

module.exports = mongoose.model('Order', orderSchema);
