const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
    originalLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Log' },
    description: String,
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
    assignedTo: { type: String, default: 'Unassigned' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Incident', IncidentSchema);