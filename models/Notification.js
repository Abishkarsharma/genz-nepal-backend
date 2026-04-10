const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['new_order', 'order_status', 'message'], default: 'new_order' },
  title: { type: String, required: true },
  body: { type: String, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  read: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
