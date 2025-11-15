const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const User = require('../models/User.model');

const auth = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'No token, authorization denied'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'User not found, invalid token'));
    }

    if (user.status === 'suspended') {
      return next(new ApiError(httpStatus.FORBIDDEN, 'User account is suspended'));
    }

    req.user = user;
    next();
  } catch (err) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token is not valid'));
  }
};

module.exports = auth;
