const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  originalPrice: { type: Number },
  category: String,
  image: String,
  stock: { type: Number, default: 0 },
  sold: { type: Number, default: 0 },
  brand: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  specifications: [{ key: String, value: String }],
}, { timestamps: true });

// ── Indexes for fast queries ──────────────────────────────────────────────────

// Full-text search on name, description, category
productSchema.index({ name: 'text', description: 'text', category: 'text' });

// Category filter + newest sort (most common query pattern)
productSchema.index({ category: 1, createdAt: -1 });

// Seller's own products
productSchema.index({ createdBy: 1, createdAt: -1 });

// Price sorting
productSchema.index({ price: 1 });
productSchema.index({ price: -1 });

module.exports = mongoose.model('Product', productSchema);
