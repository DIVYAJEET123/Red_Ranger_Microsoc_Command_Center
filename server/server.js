const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require("socket.io");
const { generateLog } = require('./services/logGenerator');

const app = express();
app.use(cors());
app.use(express.json());

// Setup WebSocket for Real-Time functionality
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Mock Database (In-memory for this demo, replace with Mongoose connect)
let logs = [];

// --- ROUTES ---

// 1. Get recent logs (for dashboard init)
app.get('/api/logs', (req, res) => {
  res.json(logs.slice(-50)); // Return last 50
});

// 2. Incident Management: update status [cite: 20]
app.post('/api/incidents/:id/resolve', (req, res) => {
  const logIndex = logs.findIndex(l => l._id === req.params.id);
  if (logIndex > -1) {
    logs[logIndex].status = 'Resolved';
    io.emit('log_update', logs[logIndex]);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Log not found" });
  }
});

// --- SIMULATION LOOP ---
// Continuously generate attacks every 3 seconds
setInterval(() => {
  const log = generateLog(io); // Generate
  // Add an ID for frontend handling since we aren't using real Mongo _id here
  log._id = Date.now().toString(); 
  logs.push(log);
  
  // Keep memory clean
  if (logs.length > 500) logs.shift(); 
}, 3000);

const PORT = 5000;
server.listen(PORT, () => console.log(`MicroSOC Command Center running on port ${PORT}`));