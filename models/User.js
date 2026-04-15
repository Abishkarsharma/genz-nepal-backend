const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'seller'], default: 'user' },
  profilePicture: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  emailVerified: { type: Boolean, default: false },
  emailOtp: { type: String, default: '' },
  emailOtpExpiry: { type: Date },
  // Seller payment accounts — only used when role === 'seller'
  paymentAccounts: {
    esewa: { type: String, default: '' },       // eSewa registered phone/ID
    khalti: { type: String, default: '' },      // Khalti registered phone/ID
    bankName: { type: String, default: '' },    // Bank name
    accountName: { type: String, default: '' }, // Account holder name
    accountNumber: { type: String, default: '' }, // Account number
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
