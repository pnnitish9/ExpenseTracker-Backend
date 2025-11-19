require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config');

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
