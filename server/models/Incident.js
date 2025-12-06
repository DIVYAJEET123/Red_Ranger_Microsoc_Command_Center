const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
    originalLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Log' },
    description: String,
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
    // New Fields for Admin Authority & Analytics
    assignedTo: { type: String, default: 'Unassigned' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // The Analyst who fixed it
    resolvedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Incident', IncidentSchema);