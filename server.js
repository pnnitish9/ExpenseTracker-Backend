require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config');
const emailService = require('./services/email.service');

// Debug: Check if environment variables are loaded
console.log('🔍 Environment Check:');
console.log('- PORT:', process.env.PORT);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- GMAIL_USER:', process.env.GMAIL_USER || 'NOT SET');
console.log('- GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '***configured***' : 'NOT SET');

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test Gmail connection
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    console.log('\n📧 Testing Gmail connection...');
    await emailService.testConnection();
  } else {
    console.log('\n⚠️  Gmail not configured. OTPs will be logged to console.');
    console.log('📖 See GMAIL_SETUP_GUIDE.md for setup instructions.');
  }
});
