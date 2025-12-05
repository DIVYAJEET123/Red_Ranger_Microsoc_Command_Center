const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    attackType: String, // XSS, SQLi, etc.
    sourceIP: String,
    targetSystem: String,
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] }
});

module.exports = mongoose.model('Log', LogSchema);