const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {string} folder - Cloudinary folder name
 * @param {object} options - Extra cloudinary upload options
 * @returns {Promise<{url: string, publicId: string}>}
 */
function uploadBuffer(buffer, folder = 'genz-nepal', options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, crop: 'limit' },   // max width 1200px
          { quality: 'auto:good' },          // auto compress
          { fetch_format: 'auto' },          // serve WebP to modern browsers
        ],
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by public_id.
 */
async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
}

module.exports = { uploadBuffer, deleteImage };
