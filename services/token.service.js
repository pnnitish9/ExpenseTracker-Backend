const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const redisClient = require('../config/redis');
const ApiError = require('../utils/ApiError');
const User = require('../models/User.model');

const tokenService = {
  generateToken: (userId, role, secret, expiresIn) => {
    const payload = { id: userId, role: role };
    return jwt.sign(payload, secret, { expiresIn });
  },

  generateAuthTokens: async (user) => {
    const accessToken = tokenService.generateToken(
      user.id,
      user.role,
      process.env.JWT_ACCESS_SECRET,
      process.env.JWT_ACCESS_EXPIRATION
    );

    const refreshToken = tokenService.generateToken(
      user.id,
      user.role,
      process.env.JWT_REFRESH_SECRET,
      process.env.JWT_REFRESH_EXPIRATION
    );

    const redisKey = `refreshToken:${refreshToken}`;
    const expiresInSeconds = 7 * 24 * 60 * 60; // 7 days
    await redisClient.set(redisKey, user.id, 'EX', expiresInSeconds);

    return {
      access: { token: accessToken, expires: process.env.JWT_ACCESS_EXPIRATION },
      refresh: { token: refreshToken, expires: process.env.JWT_REFRESH_EXPIRATION },
    };
  },

  refreshAuth: async (refreshToken) => {
    const redisKey = `refreshToken:${refreshToken}`;
    const userId = await redisClient.get(redisKey);

    if (!userId) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired refresh token');
    }

    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      await redisClient.del(redisKey);
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token');
    }

    const user = await User.findById(userId);
    if (!user || user.status === 'suspended') {
      await redisClient.del(redisKey);
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found or is suspended');
    }

    const accessToken = tokenService.generateToken(
      user.id,
      user.role,
      process.env.JWT_ACCESS_SECRET,
      process.env.JWT_ACCESS_EXPIRATION
    );

    return { access: { token: accessToken, expires: process.env.JWT_ACCESS_EXPIRATION } };
  },

  invalidateRefreshToken: async (refreshToken) => {
    await redisClient.del(`refreshToken:${refreshToken}`);
  },
};

module.exports = tokenService;
