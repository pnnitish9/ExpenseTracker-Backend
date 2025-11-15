const express = require('express');
const { body } = require('express-validator');
const transactionController = require('../controllers/transaction.controller');
const catchAsync = require('../utils/catchAsync');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth); // Protect all transaction routes

router.get('/', catchAsync(transactionController.getTransactions));

router.post(
  '/',
  [
    body('type', 'Type is required').isIn(['income', 'expense']),
    body('amount', 'Amount must be a positive number').isFloat({ gt: 0 }),
    body('category', 'Category is required').not().isEmpty(),
    body('description', 'Description is required').not().isEmpty(),
    body('date', 'Date is required').isISO8601().toDate(),
  ],
  catchAsync(transactionController.addTransaction)
);

router.put('/:id', catchAsync(transactionController.updateTransaction));

router.delete('/:id', catchAsync(transactionController.deleteTransaction));

module.exports = router;
