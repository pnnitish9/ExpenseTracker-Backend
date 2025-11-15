const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const pendingUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: { type: String, required: true, minlength: 6 },
    otp: { 
      type: String, 
      required: true 
    },
    otpExpiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
  },
  { timestamps: true }
);

// Index to automatically delete expired pending users
pendingUserSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Hash password before saving
pendingUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to check if OTP is expired
pendingUserSchema.methods.isOTPExpired = function () {
  return new Date() > this.otpExpiresAt;
};

// Method to verify OTP
pendingUserSchema.methods.verifyOTP = function (otp) {
  return this.otp === otp && !this.isOTPExpired();
};

const PendingUser = mongoose.model('PendingUser', pendingUserSchema);

module.exports = PendingUser;
