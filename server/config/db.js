const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // This connects to the database running on your laptop
    const conn = await mongoose.connect('mongodb://127.0.0.1:27017/HealthEase');

    console.log(`MongoDB Connected (Local): ${conn.connection.host}`);
  } catch (error) {
    console.log(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;