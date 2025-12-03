// server/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route (Health Check)
app.get('/', (req, res) => {
  res.send('Red Ranger MicroSOC Command Center - Backend Active');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});