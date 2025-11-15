const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
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

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        
        // Check if user already exists by email or googleId
        let user = await User.findOne({ 
          $or: [
            { email: email },
            { googleId: googleId }
          ]
        });

        if (user) {
          // Update googleId if user exists but doesn't have it
          if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user with Google OAuth
        user = new User({
          name: profile.displayName,
          email: email,
          password: `google-oauth-${googleId}-${Date.now()}`, // Unique dummy password
          googleId: googleId,
          role: 'user',
          status: 'active',
        });

        await user.save();
        
        console.log(`✅ New user created via Google OAuth: ${email}`);
        done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        done(error, null);
      }
    }
  )
);

module.exports = passport;
