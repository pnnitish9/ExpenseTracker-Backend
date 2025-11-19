const express = require('express');
const { body } = require('express-validator');
const debtController = require('../controllers/debt.controller');
const catchAsync = require('../utils/catchAsync');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth); // Protect all debt routes

router.get('/', catchAsync(debtController.getDebts));

router.get('/summary', catchAsync(debtController.getDebtSummary));

router.post(
  '/',
  [
    body('type', 'Type is required').isIn(['given', 'taken']),
    body('personName', 'Person name is required').not().isEmpty(),
    body('amount', 'Amount must be a positive number').isFloat({ gt: 0 }),
    body('description', 'Description is required').not().isEmpty(),
    body('date', 'Date is required').isISO8601().toDate(),
    body('dueDate', 'Due date must be a valid date').optional().isISO8601().toDate(),
  ],
  catchAsync(debtController.addDebt)
);

router.put('/:id', catchAsync(debtController.updateDebt));

router.patch('/:id/settle', catchAsync(debtController.settleDebt));

router.delete('/:id', catchAsync(debtController.deleteDebt));

module.exports = router;
