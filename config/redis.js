const redis = require('redis');

const redisClient = redis.createClient({
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

redisClient.on('connect', () => console.log('Connected to Redis successfully!'));
redisClient.on('error', (err) => console.error('Redis connection error:', err));

// Connect to Redis
redisClient.connect().catch(console.error);

module.exports = redisClient;
