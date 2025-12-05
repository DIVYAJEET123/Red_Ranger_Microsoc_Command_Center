require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// Import Models
const User = require('./models/User');
const Log = require('./models/Log');

const app = express();
app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected via Atlas"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- SEED USERS (Run once to create Admin/Analyst) ---
const seedUsers = async () => {
    const count = await User.countDocuments();
    if (count === 0) {
        const salt = await bcrypt.genSalt(10);
        
        // Create Red Ranger (Admin)
        const adminPass = await bcrypt.hash('morphin', salt);
        await new User({ username: 'red_ranger', password: adminPass, role: 'Admin', name: 'Red Ranger' }).save();

        // Create Alpha 5 (Analyst)
        const analystPass = await bcrypt.hash('ayiyiyi', salt);
        await new User({ username: 'alpha', password: analystPass, role: 'Analyst', name: 'Alpha 5' }).save();
        
        console.log("✅ Users Seeded (Red Ranger & Alpha 5)");
    }
};
seedUsers();

// --- SIMULATOR: Auto-Generate Logs to MongoDB ---
const ATTACKS = ['XSS', 'SQL Injection', 'Brute Force', 'DDoS', 'Malware'];
const SEVERITY = ['Low', 'Medium', 'High', 'Critical'];

setInterval(async () => {
    const newLog = new Log({
        attackType: ATTACKS[Math.floor(Math.random() * ATTACKS.length)],
        sourceIP: `192.168.1.${Math.floor(Math.random() * 255)}`,
        severity: SEVERITY[Math.floor(Math.random() * SEVERITY.length)],
        timestamp: new Date()
    });
    await newLog.save();
    
    // Cleanup: Keep DB size small (Delete logs older than 10 mins)
    // In production, you would archive this, not delete.
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    await Log.deleteMany({ timestamp: { $lt: tenMinsAgo } });

}, 3000); // New log every 3 seconds

// --- ROUTES ---

// 1. Login Route (With BCrypt Comparison)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ success: false, message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

        // Return User Info (In real app, return JWT here)
        res.json({ 
            success: true, 
            user: { username: user.username, role: user.role, name: user.name } 
        });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// 2. Get Logs
app.get('/api/logs', async (req, res) => {
    // Get last 50 logs, sorted by newest
    const logs = await Log.find().sort({ timestamp: -1 }).limit(50);
    res.json(logs);
});

// 3. Admin: Purge Logs
app.delete('/api/logs', async (req, res) => {
    await Log.deleteMany({});
    res.json({ success: true, message: "System Purged" });
});

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));