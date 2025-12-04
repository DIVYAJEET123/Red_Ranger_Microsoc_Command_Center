const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ['XSS', 'SQLi', 'Port Scan', 'Failed Login', 'DDoS', 'Malware'], 
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    required: true 
  },
  source_ip: String,
  target_system: String, // e.g., "Morphin Grid Node A"
  message: String,
  status: { type: String, default: 'Unresolved' } // For Incident Management
});

module.exports = mongoose.model('Log', LogSchema);