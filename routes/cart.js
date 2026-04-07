const router = require('express').Router();
const { protect: auth } = require('../middleware/auth');

// Cart is stored client-side; these endpoints are for server-side validation if needed.
// For MVP, we just validate product existence and return updated totals.

const Product = require('../models/Product');

router.post('/validate', auth, async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, quantity }]
    const validated = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        validated.push({
          product: product._id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: item.quantity,
        });
      }
    }
    const subtotal = validated.reduce((sum, i) => sum + i.price * i.quantity, 0);
    res.json({ items: validated, subtotal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
