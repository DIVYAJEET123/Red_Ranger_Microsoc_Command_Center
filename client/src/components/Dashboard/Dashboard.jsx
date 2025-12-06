import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import './Dashboard.css';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [data, setData] = useState({ logs: [], incidents: [] });
    const [adminStats, setAdminStats] = useState([]); 
    const [socket, setSocket] = useState(null);

    // Initial Fetch
    const fetchData = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/dashboard-data');
            const json = await res.json();
            setData(json);

            // Fetch Admin Stats if user is Admin
            if (user.role === 'Admin') {
                const statsRes = await fetch('http://localhost:5000/api/admin/analyst-performance');
                const statsJson = await statsRes.json();
                setAdminStats(statsJson);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        }
    };

    // --- FIX: ROBUST RESOLVE FUNCTION ---
    const resolveIncident = async (id) => {
        try {
            console.log(`Attempting to resolve incident ${id} by user ${user.id}`);
            
            const res = await fetch(`http://localhost:5000/api/incidents/${id}/resolve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }) 
            });

            const result = await res.json();
            
            if (result.success) {
                // FORCE REFRESH: Don't wait for socket
                fetchData(); 
            } else {
                alert("Failed to resolve: " + result.message);
            }
        } catch (error) {
            console.error("Error resolving incident:", error);
            alert("Network Error: Could not resolve incident.");
        }
    };

    useEffect(() => {
        fetchData();

        // WebSocket Connection
        const newSocket = io('http://localhost:5000');
        setSocket(newSocket);

        newSocket.on('new_log', (log) => {
            setData(prev => ({ ...prev, logs: [log, ...prev.logs].slice(0, 50) }));
        });

        newSocket.on('new_incident', (incident) => {
            setData(prev => ({ ...prev, incidents: [incident, ...prev.incidents] }));
        });

        newSocket.on('refresh_data', () => {
            fetchData(); // Syncs everyone else
        });

        return () => newSocket.disconnect();
    }, [user]);

    // Calculate max score for progress bars
    const maxScore = adminStats.reduce((max, stat) => Math.max(max, stat.resolvedCount), 1);

    return (
        <div className="dash-container">
            <header className="dash-header">
                <div className="header-left">
                    <div className="ranger-logo">⚡</div>
                    <div>
                        <h1>MICROSOC COMMAND CENTER</h1>
                        <p className="status-text">SYSTEM STATUS: <span className="blink">ONLINE</span></p>
                    </div>
                </div>
                <div className="header-right">
                    <div className="user-profile">
                        <span className="user-name">{user.name}</span>
                        <span className={`user-role role-${user.role}`}>{user.role}</span>
                    </div>
                    <button onClick={logout} className="logout-btn">EJECT</button>
                </div>
            </header>

            {/* === UPGRADED ADMIN PANEL === */}
            {user.role === 'Admin' && (
                <div className="admin-section">
                    <h3 className="section-title">🛡️ RANGER PERFORMANCE METRICS</h3>
                    <div className="operator-grid">
                        {adminStats.length === 0 ? <p className="no-data">No active operations data.</p> : adminStats.map(stat => (
                            <div key={stat.name} className="operator-card">
                                <div className="card-top">
                                    <div className="avatar-circle">{stat.name.charAt(0)}</div>
                                    <div className="operator-info">
                                        <h4>{stat.name}</h4>
                                        {/* --- UPDATED SECTION START --- */}
                                        <small style={{ 
                                            color: stat.role === 'Admin' ? '#fbbf24' : '#3b82f6',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase'
                                        }}>
                                            {stat.role}
                                        </small>
                                        {/* --- UPDATED SECTION END --- */}
                                    </div>
                                    <div className="rank-badge">#{adminStats.indexOf(stat) + 1}</div>
                                </div>
                                <div className="card-stats">
                                    <span className="stat-label">Threats Neutralized</span>
                                    <span className="stat-value">{stat.resolvedCount}</span>
                                </div>
                                <div className="progress-bg">
                                    <div 
                                        className="progress-fill" 
                                        style={{width: `${(stat.resolvedCount / maxScore) * 100}%`}}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="main-grid">
                {/* Live Log Stream */}
                <div className="panel log-panel">
                    <h3>🌐 LIVE NEURAL NETWORK FEED</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr><th>TIME</th><th>ORIGIN</th><th>THREAT LEVEL</th><th>VECTOR</th><th>STATUS</th></tr>
                            </thead>
                            <tbody>
                                {data.logs.map(log => (
                                    <tr key={log._id} className={log.severity === 'Critical' ? 'row-crit' : ''}>
                                        <td className="mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                        <td>
                                            <span className="country-code">{log.country}</span>
                                            <span className="ip-addr">{log.sourceIP}</span>
                                        </td>
                                        <td>
                                            <div className="threat-bar-container">
                                                <div 
                                                    className="threat-fill"
                                                    style={{
                                                        width: `${log.threatScore}%`,
                                                        backgroundColor: log.threatScore > 50 ? '#EF4444' : '#10B981'
                                                    }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td>{log.attackType}</td>
                                        <td><span className={`badge ${log.severity}`}>{log.severity}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Incident Management */}
                <div className="panel incident-panel">
                    <h3>⚠️ ACTIVE THREATS</h3>
                    <div className="incident-list">
                        {data.incidents.filter(i => i.status !== 'Resolved').length === 0 ? 
                            <div className="all-clear">
                                <div className="shield-icon">🛡️</div>
                                <p>SECTOR SECURE</p>
                            </div> 
                            : 
                            data.incidents.map(inc => (
                                <div key={inc._id} className={`incident-card ${inc.status}`}>
                                    <div className="incident-header">
                                        <span className="incident-type">ALERT</span>
                                        <span className={`status-dot ${inc.status}`}></span>
                                    </div>
                                    <p className="incident-desc">{inc.description}</p>
                                    
                                    {inc.status !== 'Resolved' ? (
                                        <button 
                                            className="resolve-btn" 
                                            onClick={() => resolveIncident(inc._id)}
                                        >
                                            INITIATE PROTOCOL
                                        </button>
                                    ) : (
                                        <div className="resolved-stamp">NEUTRALIZED by {inc.resolvedBy ? 'Ranger' : 'System'}</div>
                                    )}
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;