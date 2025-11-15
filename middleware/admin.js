const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const admin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Access denied. Admin role required.'));
  }
  next();
};

module.exports = admin;
