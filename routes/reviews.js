const router = require('express').Router();
const Review = require('../models/Review');
const { protect } = require('../middleware/auth');

// Get reviews for a product
router.get('/', async (req, res) => {
  try {
    const { product } = req.query;
    if (!product) return res.status(400).json({ message: 'product query param required' });

    const reviews = await Review.find({ product }).populate('user', 'name profilePicture').sort({ createdAt: -1 });
    const count = reviews.length;
    const avgRating = count > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    res.json({ reviews, avgRating, count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit or update a review
router.post('/', protect, async (req, res) => {
  try {
    const { product, rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const review = await Review.findOneAndUpdate(
      { product, user: req.user.id },
      { rating, comment },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a review
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    if (String(review.user) !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
