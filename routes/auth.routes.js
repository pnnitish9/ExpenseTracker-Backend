const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const catchAsync = require('../utils/catchAsync');
const auth = require('../middleware/auth');

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be 6+ characters').isLength({ min: 6 }),
  ],
  catchAsync(authController.register)
);

// Login
router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists(),
  ],
  catchAsync(authController.login)
);

// Refresh token
router.post(
  '/refresh-token',
  [body('refreshToken', 'Refresh token is required').not().isEmpty()],
  catchAsync(authController.refreshToken)
);

// Logout
router.post(
  '/logout',
  [body('refreshToken', 'Refresh token is required').not().isEmpty()],
  catchAsync(authController.logout)
);

// Get current user
router.get('/me', auth, catchAsync(authController.getMe));

// Change password
router.post(
  '/change-password',
  auth,
  [
    body('currentPassword', 'Current password is required').optional(),
    body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
  ],
  catchAsync(authController.changePassword)
);

module.exports = router;
