const express = require('express');
const adminController = require('../controllers/admin.controller');
const catchAsync = require('../utils/catchAsync');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

router.use(auth, admin); // Protect all admin routes

router.get('/stats', catchAsync(adminController.getPlatformStats));
router.get('/users', catchAsync(adminController.getAllUsers));
router.put('/users/:id/status', catchAsync(adminController.updateUserStatus));
router.get('/transactions', catchAsync(adminController.getAllTransactions));

module.exports = router;
