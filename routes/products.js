const router = require('express').Router();
const Product = require('../models/Product');
const { protect, requireRole } = require('../middleware/auth');

// Public: get all products (with optional category, search, barcode filter)
router.get('/', async (req, res) => {
  try {
    const { category, search, barcode } = req.query;

    // Barcode lookup — return single product
    if (barcode) {
      const product = await Product.findOne({ barcode });
      if (!product) return res.status(404).json({ message: 'Product not found' });
      return res.json(product);
    }

    let filter = {};
    if (category) filter.category = category;
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { category: regex }];
    }

    const products = await Product.find(filter);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public: get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin or Seller: create product
router.post('/', protect, requireRole('admin', 'seller'), async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin or Seller (own product): update product
router.put('/:id', protect, requireRole('admin', 'seller'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Sellers can only edit their own products
    if (req.user.role === 'seller' && String(product.createdBy) !== req.user.id) {
      return res.status(403).json({ message: 'Not your product' });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin or Seller (own product): delete product
router.delete('/:id', protect, requireRole('admin', 'seller'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.user.role === 'seller' && String(product.createdBy) !== req.user.id) {
      return res.status(403).json({ message: 'Not your product' });
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
