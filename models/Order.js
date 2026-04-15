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
  // Cancellation details
  cancelReason: { type: String, default: '' },
  cancelNote: { type: String, default: '' },
  cancelledAt: { type: Date, default: null },
  cancelledBy: { type: String, enum: ['customer', 'seller', 'admin', ''], default: '' },
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ 'items.product': 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
