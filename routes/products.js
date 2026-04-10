const router = require('express').Router();
const Product = require('../models/Product');
const { protect, requireRole } = require('../middleware/auth');

// Public: get all products (with optional category, search filter + pagination)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20); // cap at 100

    let filter = {};

    if (category) filter.category = category;

    if (search) {
      // Use MongoDB text index if available, fall back to regex
      try {
        filter.$text = { $search: search };
      } catch {
        const regex = new RegExp(search, 'i');
        filter.$or = [{ name: regex }, { category: regex }, { description: regex }];
      }
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
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
    const { name, price, stock, category } = req.body;
    if (!name || price === undefined || !category)
      return res.status(400).json({ message: 'name, price, and category are required' });
    if (isNaN(price) || Number(price) < 0)
      return res.status(400).json({ message: 'price must be a non-negative number' });
    if (stock !== undefined && (isNaN(stock) || Number(stock) < 0))
      return res.status(400).json({ message: 'stock must be a non-negative number' });

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
