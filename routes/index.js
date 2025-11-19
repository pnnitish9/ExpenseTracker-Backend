const express = require('express');
const authRoutes = require('./auth.routes');
const transactionRoutes = require('./transaction.routes');
const debtRoutes = require('./debt.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/transactions', transactionRoutes);
router.use('/debts', debtRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
