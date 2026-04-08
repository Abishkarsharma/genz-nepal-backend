const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: String,
  image: String,
  stock: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  barcode: { type: String, default: '' },
  specifications: [{ key: String, value: String }],
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
