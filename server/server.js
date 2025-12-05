require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/User');
const Log = require('./models/Log');
const Incident = require('./models/Incident');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Atlas Connected"))
    .catch(err => console.error("❌ DB Error:", err));

// --- 2. SEED USERS (Run once to create accounts) ---
const seedUsers = async () => {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
        const salt = await bcrypt.genSalt(10);
        const adminHash = await bcrypt.hash('admin123', salt);
        const analystHash = await bcrypt.hash('analyst123', salt);

        await new User({ username: 'admin', password: adminHash, role: 'Admin', name: 'Red Ranger' }).save();
        await new User({ username: 'analyst', password: analystHash, role: 'Analyst', name: 'Alpha 5' }).save();
        console.log("✅ Default Users Created: admin/admin123 & analyst/analyst123");
    }
};
seedUsers();

// --- 3. LOG INGESTION SIMULATOR & THREAT ENGINE ---
// [cite: 15, 16, 17, 18]
const ATTACKS = ['XSS', 'SQL Injection', 'Port Scan', 'Failed Login', 'Brute Force'];
const SYSTEMS = ['Morphin_Grid_Core', 'Zord_Uplink', 'Command_Console', 'Firewall_Node_A'];
const SEVERITY = ['Low', 'Low', 'Medium', 'High', 'Critical']; // Weighted probabilities

setInterval(async () => {
    // A. Generate Log
    const randSev = SEVERITY[Math.floor(Math.random() * SEVERITY.length)];
    const newLog = new Log({
        attackType: ATTACKS[Math.floor(Math.random() * ATTACKS.length)],
        sourceIP: `192.168.1.${Math.floor(Math.random() * 255)}`,
        targetSystem: SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)],
        severity: randSev,
        timestamp: new Date()
    });
    const savedLog = await newLog.save();

    // B. Threat Classification Engine (Rule-Based) 
    // Rule: If Severity is Critical or High -> Auto-create Incident
    if (randSev === 'Critical' || randSev === 'High') {
        const newIncident = new Incident({
            originalLogId: savedLog._id,
            description: `Auto-Escalated: ${savedLog.attackType} on ${savedLog.targetSystem}`,
            status: 'Open'
        });
        await newIncident.save();
    }

    // C. Cleanup (Keep DB light for demo)
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    await Log.deleteMany({ timestamp: { $lt: tenMinsAgo } });

}, 3000); // Run every 3 seconds

// --- 4. API ROUTES ---

// Auth Route 
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    res.json({ 
        success: true, 
        user: { id: user._id, name: user.name, role: user.role, username: user.username } 
    });
});

// Get Stats & Logs for Dashboard [cite: 21, 22]
app.get('/api/dashboard-data', async (req, res) => {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(50);
    const incidents = await Incident.find().sort({ createdAt: -1 });
    
    // Simple Aggregation for "Most Frequent Attacker IP" [cite: 22]
    const ipStats = await Log.aggregate([
        { $group: { _id: "$sourceIP", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
    ]);

    res.json({ logs, incidents, topAttacker: ipStats[0] || { _id: 'None', count: 0 } });
});

// Update Incident Status 
app.put('/api/incidents/:id', async (req, res) => {
    const { status } = req.body;
    await Incident.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true });
});

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));