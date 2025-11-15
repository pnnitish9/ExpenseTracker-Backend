/**
 * A wrapper for async route handlers to catch errors
 * and pass them to the global error handler.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => next(err));
};

module.exports = catchAsync;
