const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const routes = require('./routes');
const errorHandler = require('./middleware/error');
const ApiError = require('./utils/ApiError');
const { redisClient } = require('./config');
const passport = require('./config/passport');

const app = express();

// Global Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (required for passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/v1', routes);

// Health Check Route
app.get('/', (req, res) => {
  res.status(200).send({
    message: 'Expense Tracker API is running!',
    databases: {
      mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redisClient.status === 'ready' ? 'connected' : 'disconnected',
    },
  });
});

// Error Handling
app.use((req, res, next) => {
  // 404 handler
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

app.use(errorHandler); // Global error handler

module.exports = app;
