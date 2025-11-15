const redisClient = require('../config/redis');

/**
 * A simple get/set wrapper for the Redis client to handle JSON
 * and caching logic.
 */
const cache = {
  get: async (key) => {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`Redis GET error for key [${key}]:`, err);
      return null;
    }
  },

  set: async (key, value, expiresInSeconds = 3600) => {
    try {
      const stringValue = JSON.stringify(value);
      await redisClient.set(key, stringValue, 'EX', expiresInSeconds);
    } catch (err) {
      console.error(`Redis SET error for key [${key}]:`, err);
    }
  },

  del: async (key) => {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.error(`Redis DEL error for key [${key}]:`, err);
    }
  },
};

module.exports = cache;
