const httpStatus = require('http-status');
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');
const Debt = require('../models/Debt.model');
const cache = require('../services/cache.service');

const debtController = {
  getDebts: async (req, res) => {
    const userId = req.user.id;
    const cacheKey = `debts:user:${userId}`;

    const cachedData = await cache.get(cacheKey);
    if (cachedData) return res.status(httpStatus.OK).send(cachedData);

    const debts = await Debt.find({ user: userId }).sort({ date: -1 });
    await cache.set(cacheKey, debts, 3600); // Cache for 1 hour

    res.status(httpStatus.OK).send(debts);
  },

  addDebt: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(httpStatus.BAD_REQUEST, errors.array()[0].msg);
    }

    const { type, personName, amount, description, date, dueDate } = req.body;

    const debt = await Debt.create({
      user: req.user.id,
      type,
      personName,
      amount,
      description,
      date,
      dueDate,
      status: 'pending',
    });

    await cache.del(`debts:user:${req.user.id}`);

    res.status(httpStatus.CREATED).send(debt);
  },

  updateDebt: async (req, res) => {
    const { id } = req.params;
    const { personName, amount, description, date, dueDate } = req.body;

    let debt = await Debt.findById(id);

    if (!debt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Debt not found');
    }

    if (debt.user.toString() !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User not authorized');
    }

    debt = await Debt.findByIdAndUpdate(
      id,
      { $set: { personName, amount, description, date, dueDate } },
      { new: true, runValidators: true }
    );

    await cache.del(`debts:user:${req.user.id}`);

    res.status(httpStatus.OK).send(debt);
  },

  settleDebt: async (req, res) => {
    const { id } = req.params;

    let debt = await Debt.findById(id);

    if (!debt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Debt not found');
    }

    if (debt.user.toString() !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User not authorized');
    }

    debt = await Debt.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: 'settled',
          settledDate: new Date()
        } 
      },
      { new: true }
    );

    await cache.del(`debts:user:${req.user.id}`);

    res.status(httpStatus.OK).send(debt);
  },

  deleteDebt: async (req, res) => {
    const { id } = req.params;
    const debt = await Debt.findById(id);

    if (!debt) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Debt not found');
    }

    if (debt.user.toString() !== req.user.id) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User not authorized');
    }

    await Debt.findByIdAndDelete(id);

    await cache.del(`debts:user:${req.user.id}`);

    res.status(httpStatus.OK).send({ message: 'Debt removed' });
  },

  getDebtSummary: async (req, res) => {
    const userId = req.user.id;
    const debts = await Debt.find({ user: userId });

    const summary = {
      totalGiven: 0,
      totalTaken: 0,
      pendingGiven: 0,
      pendingTaken: 0,
      settledGiven: 0,
      settledTaken: 0,
    };

    debts.forEach(debt => {
      if (debt.type === 'given') {
        summary.totalGiven += debt.amount;
        if (debt.status === 'pending') {
          summary.pendingGiven += debt.amount;
        } else {
          summary.settledGiven += debt.amount;
        }
      } else {
        summary.totalTaken += debt.amount;
        if (debt.status === 'pending') {
          summary.pendingTaken += debt.amount;
        } else {
          summary.settledTaken += debt.amount;
        }
      }
    });

    res.status(httpStatus.OK).send(summary);
  },
};

module.exports = debtController;
