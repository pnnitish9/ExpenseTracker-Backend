const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const catchAsync = require('../utils/catchAsync');

const router = express.Router();

// New OTP-based registration
router.post(
  '/send-otp',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be 6+ characters').isLength({ min: 6 }),
  ],
  catchAsync(authController.sendOTP)
);

router.post(
  '/verify-otp',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('otp', 'OTP is required').not().isEmpty().isLength({ min: 6, max: 6 }),
  ],
  catchAsync(authController.verifyOTP)
);

// Original register route (kept for backward compatibility)
router.post(
  '/register',
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be 6+ characters').isLength({ min: 6 }),
  ],
  catchAsync(authController.register)
);

router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password is required').exists(),
  ],
  catchAsync(authController.login)
);

router.post(
  '/refresh-token',
  [body('refreshToken', 'Refresh token is required').not().isEmpty()],
  catchAsync(authController.refreshToken)
);

router.post(
  '/logout',
  [body('refreshToken', 'Refresh token is required').not().isEmpty()],
  catchAsync(authController.logout)
);

// Get current user
const auth = require('../middleware/auth');
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

// Google OAuth routes
const passport = require('../config/passport');

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: 'http://localhost:3000?error=auth_failed' }),
  catchAsync(authController.googleCallback)
);

module.exports = router;
