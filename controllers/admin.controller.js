const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const User = require('../models/User.model');
const Transaction = require('../models/Transaction.model');
const cache = require('../services/cache.service');

const adminController = {
  getPlatformStats: async (req, res) => {
    const cacheKey = 'platform:stats';
    const cachedStats = await cache.get(cacheKey);
    if (cachedStats) return res.status(httpStatus.OK).send(cachedStats);

    const totalUsers = await User.countDocuments();
    const totalTransactions = await Transaction.countDocuments();

    const incomeAgg = await Transaction.aggregate([
      { $match: { type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalIncome = incomeAgg[0]?.total || 0;

    const expenseAgg = await Transaction.aggregate([
      { $match: { type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalExpense = expenseAgg[0]?.total || 0;

    const stats = {
      totalUsers,
      totalTransactions,
      totalIncome,
      totalExpense,
      platformBalance: totalIncome - totalExpense,
    };

    await cache.set(cacheKey, stats, 1800); // Cache for 30 mins
    res.status(httpStatus.OK).send(stats);
  },

  getAllUsers: async (req, res) => {
    const cacheKey = 'platform:all_users';
    const cachedUsers = await cache.get(cacheKey);
    if (cachedUsers) return res.status(httpStatus.OK).send(cachedUsers);

    const users = await User.find({}).sort({ createdAt: -1 });
    await cache.set(cacheKey, users, 1800);

    res.status(httpStatus.OK).send(users);
  },

  updateUserStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid status');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (user.id === req.user.id) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Admin cannot change their own status');
    }

    user.status = status;
    await user.save();

    await cache.del('platform:all_users');
    res.status(httpStatus.OK).send(user);
  },

  getAllTransactions: async (req, res) => {
    const cacheKey = 'platform:all_transactions';
    const cachedTxs = await cache.get(cacheKey);
    if (cachedTxs) return res.status(httpStatus.OK).send(cachedTxs);

    const transactions = await Transaction.find({})
      .populate('user', 'name email')
      .sort({ date: -1 });

    await cache.set(cacheKey, transactions, 1800);
    res.status(httpStatus.OK).send(transactions);
  },
};

module.exports = adminController;
