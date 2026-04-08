const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, default: '' },
  senderEmail: { type: String, default: '' },
  message: { type: String, required: true, maxlength: 1000 },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
