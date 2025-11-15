const connectDB = require('./db');
const redisClient = require('./redis');

module.exports = {
  connectDB,
  redisClient,
};
