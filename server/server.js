require('dotenv').config();

// --- DEBUGGING START ---
console.log("------------------------------------------------");
console.log("DEBUG: Checking API Key...");
if (!process.env.ABUSEIPDB_KEY) {
    console.error("❌ ERROR: ABUSEIPDB_KEY is undefined. Check your .env file location!");
} else {
    console.log("✅ SUCCESS: API Key loaded. Starts with:", process.env.ABUSEIPDB_KEY.substring(0, 5) + "...");
}
console.log("------------------------------------------------");
// --- DEBUGGING END ---

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http'); // Required for Socket.io
const { Server } = require('socket.io');
const axios = require('axios'); // For External API calls

// Models
const User = require('./models/User');
const Log = require('./models/Log');
const Incident = require('./models/Incident');

const app = express();
app.use(cors());
app.use(express.json());

// --- SOCKET.IO SETUP (Real-time Streaming) ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// --- MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Atlas Connected"))
    .catch(err => console.error("❌ DB Error:", err));

// --- ANOMALY DETECTION ENGINE (In-Memory) ---
// Stores hit timestamps for every IP: { "192.168.1.1": [timestamp1, timestamp2] }
const trafficWindow = new Map(); 
const SPIKE_THRESHOLD = 5; // >5 hits triggers alert
const WINDOW_TIME = 10000; // 10 Seconds

// --- HELPER: REAL THREAT INTEL API ---
const getThreatData = async (ip) => {
    // Skip local/private IPs to avoid API errors
    if (ip.startsWith('192.168') || ip.startsWith('127') || ip === '::1') {
        return { country: 'Local Network', score: 0 };
    }
    try {
        const res = await axios.get('https://api.abuseipdb.com/api/v2/check', {
            params: { ipAddress: ip, maxAgeInDays: 90 },
            headers: { 'Key': process.env.ABUSEIPDB_KEY, 'Accept': 'application/json' }
        });
        return {
            country: res.data.data.countryCode || 'Unknown',
            score: res.data.data.abuseConfidenceScore || 0
        };
    } catch (error) {
        console.log("⚠️ API Limit or Error:", error.message);
        return { country: 'Unknown', score: 0 };
    }
};

// --- SIMULATION LOOP WITH REAL DATA ---
const ATTACKS = ['SQL Injection', 'XSS', 'Brute Force', 'DDoS Probe', 'Port Scan'];
const SYSTEMS = ['Morphin_Grid', 'Zord_Network', 'Firewall_A'];

setInterval(async () => {
    // 1. Generate a semi-random IP (Simulating inbound traffic)
    const octet = Math.floor(Math.random() * 255);
    const simulatedIP = `118.25.6.${octet}`; // Using public IP ranges to test API

    // 2. Fetch REAL Intelligence
    const intel = await getThreatData(simulatedIP);
    
    // 3. Determine Severity based on Real Threat Score
    let severity = 'Low';
    if (intel.score > 80) severity = 'Critical';
    else if (intel.score > 50) severity = 'High';
    else if (intel.score > 20) severity = 'Medium';

    const newLog = new Log({
        attackType: ATTACKS[Math.floor(Math.random() * ATTACKS.length)],
        sourceIP: simulatedIP,
        targetSystem: SYSTEMS[Math.floor(Math.random() * SYSTEMS.length)],
        severity: severity,
        country: intel.country,
        threatScore: intel.score,
        timestamp: new Date()
    });
    
    const savedLog = await newLog.save();

    // 4. Continuous Live Stream -> Emit to Frontend
    io.emit('new_log', savedLog);

    // 5. Real-time Pattern Detection (Anomaly Spike)
    const now = Date.now();
    let hits = trafficWindow.get(simulatedIP) || [];
    hits = hits.filter(t => now - t < WINDOW_TIME); // Keep only recent hits
    hits.push(now);
    trafficWindow.set(simulatedIP, hits);

    if (hits.length > SPIKE_THRESHOLD) {
        // Create Incident for Anomaly
        const anomalyDesc = `ANOMALY: High Traffic Spike from ${simulatedIP} (${intel.country})`;
        const exists = await Incident.findOne({ description: anomalyDesc, status: { $ne: 'Resolved' } });
        
        if (!exists) {
            const inc = await new Incident({ originalLogId: savedLog._id, description: anomalyDesc, status: 'Open' }).save();
            io.emit('new_incident', inc);
        }
    } 
    // Also create incident for Critical Threat Scores
    else if (severity === 'Critical') {
        const desc = `CRITICAL THREAT: Known Malicious IP ${simulatedIP} (Score: ${intel.score})`;
        const exists = await Incident.findOne({ description: desc, status: { $ne: 'Resolved' } });
        if(!exists) {
            const inc = await new Incident({ originalLogId: savedLog._id, description: desc, status: 'Open' }).save();
            io.emit('new_incident', inc);
        }
    }

}, 4000); // Run every 4 seconds to respect API limits

// --- ROUTES ---

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    // Note: Assuming passwords in DB are hashed. If manual seed, use simple check or bcrypt.
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    res.json({ success: true, user: { id: user._id, name: user.name, role: user.role } });
});

// Admin Stats Route (Corrected to include Role)
app.get('/api/admin/analyst-performance', async (req, res) => {
    const stats = await Incident.aggregate([
        { $match: { status: 'Resolved' } },
        { $group: { _id: "$resolvedBy", count: { $sum: 1 } } },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { name: "$user.name", role: "$user.role", resolvedCount: "$count" } }
    ]);
    res.json(stats);
});

// Dashboard Data
app.get('/api/dashboard-data', async (req, res) => {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(50);
    const incidents = await Incident.find().sort({ createdAt: -1 });
    res.json({ logs, incidents });
});

// Resolve Incident
app.put('/api/incidents/:id/resolve', async (req, res) => {
    const { userId } = req.body;
    await Incident.findByIdAndUpdate(req.params.id, { 
        status: 'Resolved',
        resolvedBy: userId,
        resolvedAt: new Date()
    });
    // Notify all clients to refresh
    io.emit('refresh_data');
    res.json({ success: true });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));