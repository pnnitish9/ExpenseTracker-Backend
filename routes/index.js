const express = require('express');
const authRoutes = require('./auth.routes');
const transactionRoutes = require('./transaction.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
