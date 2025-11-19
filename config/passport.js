const passport = require('passport');
const User = require('../models/User.model');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Passport configuration without Google OAuth
// Add other strategies here if needed in the future

module.exports = passport;
