const Log = require('../models/Log');

// Configuration for random generation
const ATTACK_TYPES = ['XSS', 'SQLi', 'Port Scan', 'Failed Login'];
const TARGETS = ['Morphin Grid Core', 'Zord Control', 'Alpha-5 Uplink', 'Firewall Node'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

// Helper to get random item
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomIP = () => `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;

// The Generator Function
const generateLog = async (io) => {
  const type = getRandom(ATTACK_TYPES);
  
  // Simple Threat Classification Logic [cite: 17]
  let severity = 'Low';
  if (type === 'SQLi') severity = 'High';
  if (type === 'Failed Login' && Math.random() > 0.8) severity = 'Critical'; // Simulate brute force

  const newLog = new Log({
    type: type,
    severity: severity,
    source_ip: getRandomIP(),
    target_system: getRandom(TARGETS),
    message: `Detected ${type} attempt on ${getRandom(TARGETS)}`
  });

  // Save to DB (Optional for simulation speed, but good for persistence)
  // await newLog.save(); 
  
  // Emit to Frontend immediately via WebSocket (Live Streaming) 
  io.emit('new_log', newLog);
  
  return newLog;
};

module.exports = { generateLog };