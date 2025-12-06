const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    attackType: String,
    sourceIP: String,
    targetSystem: String,
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'] },
    // New Fields for Real Threat Intel
    country: { type: String, default: 'Unknown' },
    threatScore: { type: Number, default: 0 }, // 0-100 Score from API
    isISP: { type: Boolean, default: false }
});

module.exports = mongoose.model('Log', LogSchema);