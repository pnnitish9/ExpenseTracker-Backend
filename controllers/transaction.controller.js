const httpStatus = require('http-status');
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const Transaction = require('../models/Transaction.model');
const cache = require('../services/cache.service');

const transactionController = {
  getTransactions: async (req, res) => {
    const userId = req.user.id;
    const cacheKey = `transactions:user:${userId}`;

    const cachedData = await cache.get(cacheKey);
    if (cachedData) return res.status(httpStatus.OK).send(cachedData);

    const transactions = await Transaction.find({ user: userId }).sort({ date: -1 });
    await cache.set(cacheKey, transactions, 3600); // Cache for 1 hour

    res.status(httpStatus.OK).send(transactions);
  },

  addTransaction: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(httpStatus.BAD_REQUEST, errors.array()[0].msg);
    }

    const { type, amount, category, description, date } = req.body;

    const transaction = await Transaction.create({
      user: req.user.id,
      type,
      amount,
      category,
      description,
      date,
    });

    await cache.del(`transactions:user:${req.user.id}`);
    await cache.del('platform:stats');
    await cache.del('platform:all_transactions');

    res.status(httpStatus.CREATED).send(transaction);
  },

  updateTransaction: async (req, res) => {
    const { id } = req.params;
    const { amount, category, description, date } = req.body;

    let transaction = await Transaction.findById(id);

    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
    }

    if (transaction.user.toString() !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User not authorized');
    }

    transaction = await Transaction.findByIdAndUpdate(
      id,
      { $set: { amount, category, description, date } },
      { new: true, runValidators: true }
    );

    await cache.del(`transactions:user:${req.user.id}`);
    await cache.del('platform:stats');
    await cache.del('platform:all_transactions');

    res.status(httpStatus.OK).send(transaction);
  },

  deleteTransaction: async (req, res) => {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
    }

    if (transaction.user.toString() !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User not authorized');
    }

    await Transaction.findByIdAndDelete(id);

    await cache.del(`transactions:user:${req.user.id}`);
    await cache.del('platform:stats');
    await cache.del('platform:all_transactions');

    res.status(httpStatus.OK).send({ message: 'Transaction removed' });
  },
};

module.exports = transactionController;
