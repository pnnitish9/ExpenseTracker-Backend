const httpStatus = require('http-status');
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const User = require('../models/User.model');
const tokenService = require('../services/token.service');

const authController = {
  // Register
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
