const router = require('express').Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { uploadBuffer } = require('../utils/cloudinary');

// Use memory storage — file goes to buffer, then straight to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

/**
 * POST /api/upload
 * Authenticated users (sellers, admins) can upload product images.
 * Returns: { url, publicId }
 */
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const folder = req.user.role === 'admin' ? 'genz-nepal/admin' : `genz-nepal/sellers/${req.user.id}`;
    const { url, publicId } = await uploadBuffer(req.file.buffer, folder);

    res.json({ url, publicId });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

// Handle multer errors (file too large, wrong type)
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Image must be under 5MB' });
  }
  res.status(400).json({ message: err.message });
});

module.exports = router;
