require('dotenv').config();

// --- DEBUGGING: CHECK API KEY ---
console.log("------------------------------------------------");
console.log("DEBUG: Checking API Key...");
if (!process.env.ABUSEIPDB_KEY) {
    console.error("❌ ERROR: ABUSEIPDB_KEY is undefined. Check your .env file!");
} else {
    console.log("✅ SUCCESS: API Key loaded.");
}
console.log("------------------------------------------------");

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const http = require('http'); 
const { Server } = require('socket.io');
const axios = require('axios'); 

// Models
const User = require('./models/User');
const Log = require('./models/Log');
const Incident = require('./models/Incident');

const app = express();
app.use(cors());
app.use(express.json());

// --- SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Atlas Connected"))
    .catch(err => console.error("❌ DB Error:", err));

// --- ANOMALY DETECTION ENGINE ---
const trafficWindow = new Map(); 
const ipCache = new Map(); // Local Memory Cache to save API credits
const SPIKE_THRESHOLD = 5; 
const WINDOW_TIME = 10000; 

// --- HELPER: ROBUST THREAT INTELLIGENCE ---
const getThreatData = async (ip) => {
    // 1. SKIP LOCAL IPs
    if (ip.startsWith('192.168') || ip.startsWith('127') || ip === '::1') {
        return { country: 'Local Network', score: 0 };
    }

    // 2. CHECK CACHE (Save API Credits)
    if (ipCache.has(ip)) {
        return ipCache.get(ip);
    }

    try {
        // 3. ATTEMPT REAL API CALL
        const res = await axios.get('https://api.abuseipdb.com/api/v2/check', {
            params: { 
                ipAddress: ip, 
                maxAgeInDays: 90,
                verbose: true // <--- FIX: Asks for full countryName
            },
            headers: { 'Key': process.env.ABUSEIPDB_KEY, 'Accept': 'application/json' }
        });

        const realData = {
            // Use 'countryName' if available, otherwise fallback to 'countryCode'
            country: res.data.data.countryName || res.data.data.countryCode || 'Unknown',
            score: res.data.data.abuseConfidenceScore || 0
        };

        ipCache.set(ip, realData);
        return realData;

    } catch (error) {
        // 4. FALLBACK SIMULATION (If API fails or Limit Reached)
        // This ensures the dashboard NEVER shows "Unknown"
        
        // Deterministic list of countries for the simulation
        const mockCountries = ['China', 'Russia', 'United States', 'North Korea', 'Brazil', 'Germany', 'Iran'];
        const lastOctet = parseInt(ip.split('.')[3] || '0');
        
        const mockData = {
            country: mockCountries[lastOctet % mockCountries.length], // Pick country based on IP number
            score: (lastOctet % 100) // Fake score based on IP number
        };

        ipCache.set(ip, mockData); 
        return mockData;
    }
};

// --- HYBRID SIMULATION LOOP ---
// Uses a "Botnet" of IPs to maximize cache hits and simulate realistic traffic
const BOTNET_IPS = Array.from({length: 15}, () => {
    return `118.25.${Math.floor(Math.random()*10)}.${Math.floor(Math.random()*255)}`;
});
const ATTACKS = ['SQL Injection', 'XSS', 'Brute Force', 'DDoS Probe', 'Port Scan'];
const SYSTEMS = ['Morphin_Grid', 'Zord_Network', 'Firewall_A', 'Command_Center_Main'];

setInterval(async () => {
    // 1. Pick an IP (Mostly from Botnet to hit Cache, rarely a new one)
    let simulatedIP;
    if (Math.random() > 0.90) {
        const octet = Math.floor(Math.random() * 255);
        simulatedIP = `45.33.2.${octet}`; // Random new IP
    } else {
        simulatedIP = BOTNET_IPS[Math.floor(Math.random() * BOTNET_IPS.length)];
    }

    // 2. Fetch Intelligence (Will use Cache or Fallback if API is dead)
    const intel = await getThreatData(simulatedIP);
    
    // 3. Determine Severity based on Threat Score
    let severity = 'Low';
    if (intel.score > 80) severity = 'Critical';
    else if (intel.score > 50) severity = 'High';
    else if (intel.score > 20) severity = 'Medium';

    // 4. Create Log
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

    // 5. Stream to Frontend
    io.emit('new_log', savedLog);

    // 6. Detect Anomalies (Spike Detection)
    const now = Date.now();
    let hits = trafficWindow.get(simulatedIP) || [];
    hits = hits.filter(t => now - t < WINDOW_TIME); 
    hits.push(now);
    trafficWindow.set(simulatedIP, hits);

    if (hits.length > SPIKE_THRESHOLD) {
        const anomalyDesc = `ANOMALY: High Traffic Spike from ${simulatedIP} (${intel.country})`;
        const exists = await Incident.findOne({ description: anomalyDesc, status: { $ne: 'Resolved' } });
        
        if (!exists) {
            const inc = await new Incident({ originalLogId: savedLog._id, description: anomalyDesc, status: 'Open' }).save();
            io.emit('new_incident', inc);
        }
    } else if (severity === 'Critical') {
        const desc = `CRITICAL THREAT: Known Malicious IP from ${intel.country} (Score: ${intel.score})`;
        const exists = await Incident.findOne({ description: desc, status: { $ne: 'Resolved' } });
        if(!exists) {
            const inc = await new Incident({ originalLogId: savedLog._id, description: desc, status: 'Open' }).save();
            io.emit('new_incident', inc);
        }
    }

}, 3000); // 3 Seconds Interval

// --- ROUTES ---

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    res.json({ success: true, user: { id: user._id, name: user.name, role: user.role } });
});

// Admin Stats Route
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
    io.emit('refresh_data');
    res.json({ success: true });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));