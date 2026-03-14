const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load config
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/v1/user', require('./routes/userRoutes'));
app.use("/api/v1/admin", require("./routes/adminRoutes"));
app.use("/api/v1/doctor", require("./routes/doctorRoutes")); // <--- YE HAI MISSING LINE 🟢

// Test Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});