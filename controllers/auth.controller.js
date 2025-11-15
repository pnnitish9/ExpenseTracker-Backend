const httpStatus = require('http-status');
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const User = require('../models/User.model');
const tokenService = require('../services/token.service');

const authController = {
  // Step 1: Send OTP to email
  sendOTP: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(httpStatus.BAD_REQUEST, errors.array()[0].msg);
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    if (await User.findOne({ email })) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store pending user data with OTP
    const PendingUser = require('../models/PendingUser.model');
    await PendingUser.findOneAndDelete({ email }); // Remove old pending user if exists
    await PendingUser.create({ name, email, password, otp });

    // Send OTP via email
    try {
      const emailService = require('../services/email.service');
      await emailService.sendOTP(email, otp, name);
      console.log(`✅ OTP sent to ${email}: ${otp}`);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // For development: Log OTP to console if email fails
      console.log(`⚠️ EMAIL FAILED - OTP for ${email}: ${otp}`);
      // Don't throw error, allow registration to continue
    }

    res.status(httpStatus.OK).send({ 
      message: 'OTP sent to your email',
      email: email,
      // For development only - remove in production
      ...(process.env.NODE_ENV === 'development' && { otp })
    });
  },

  // Step 2: Verify OTP and create user
  verifyOTP: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(httpStatus.BAD_REQUEST, errors.array()[0].msg);
    }

    const { email, otp } = req.body;

    // Find pending user
    const PendingUser = require('../models/PendingUser.model');
    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Registration session expired. Please try again.');
    }

    // Verify OTP
    if (!pendingUser.verifyOTP(otp)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired OTP');
    }

    // Create actual user - use insertMany to bypass pre-save hook
    const [user] = await User.insertMany([{
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password, // Already hashed by PendingUser model
      role: 'user',
      status: 'active',
    }], { 
      lean: false,
      rawResult: false 
    });

    // Get the full user document
    const createdUser = await User.findById(user._id);

    // Clean up pending user
    await PendingUser.findByIdAndDelete(pendingUser._id);

    // Generate tokens
    const tokens = await tokenService.generateAuthTokens(createdUser);

    res.status(httpStatus.CREATED).send({ user: createdUser, tokens });
  },

  // Google OAuth callback
  googleCallback: async (req, res) => {
    try {
      const user = req.user;
      
      // Generate tokens
      const tokens = await tokenService.generateAuthTokens(user);
      
      // Redirect to frontend with tokens
      const redirectUrl = `http://localhost:3000/auth/google/success?token=${tokens.access.token}&refreshToken=${tokens.refresh.token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect('http://localhost:3000?error=auth_failed');
    }
  },

  // Original register (kept for backward compatibility)
  register: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(httpStatus.BAD_REQUEST, errors.array()[0].msg);
    }

    const { name, email, password } = req.body;

    if (await User.findOne({ email })) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User already exists');
    }

    const user = await User.create({ name, email, password });
    const tokens = await tokenService.generateAuthTokens(user);

    res.status(httpStatus.CREATED).send({ user, tokens });
  },

  login: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(httpStatus.BAD_REQUEST, errors.array()[0].msg);
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
    }

    if (user.status === 'suspended') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Your account has been suspended');
    }

    const tokens = await tokenService.generateAuthTokens(user);
    res.status(httpStatus.OK).send({ user, tokens });
  },

  refreshToken: async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Refresh token is required');
    }

    const tokens = await tokenService.refreshAuth(refreshToken);
    res.status(httpStatus.OK).send(tokens);
  },

  logout: async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Refresh token is required');
    }

    await tokenService.invalidateRefreshToken(refreshToken);
    res.status(httpStatus.OK).send({ message: 'Logged out successfully' });
  },

  getMe: async (req, res) => {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    res.status(httpStatus.OK).send({ user });
  },

  changePassword: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(httpStatus.BAD_REQUEST, errors.array()[0].msg);
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password field
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    // Check if user has a googleId (OAuth user)
    if (user.googleId && !currentPassword) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'OAuth users must set a current password first');
    }

    // Verify current password (skip for OAuth users setting password for first time)
    if (currentPassword) {
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Current password is incorrect');
      }
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(httpStatus.OK).send({ 
      message: 'Password changed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });
  },
};

module.exports = authController;
