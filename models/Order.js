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
    city: String,
    address: String,
  },
  paymentMethod: { type: String, default: 'Cash on Delivery' },
  subtotal: Number,
  shipping: { type: Number, default: 250 },
  total: Number,
  status: { type: String, default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
