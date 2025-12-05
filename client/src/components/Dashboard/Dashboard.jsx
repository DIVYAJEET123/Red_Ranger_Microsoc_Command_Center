import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [data, setData] = useState({ logs: [], incidents: [], topAttacker: {} });

    const fetchData = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/dashboard-data');
            const json = await res.json();
            setData(json);
        } catch (err) { console.error(err); }
    };

    const resolveIncident = async (id) => {
        await fetch(`http://localhost:5000/api/incidents/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Resolved' })
        });
        fetchData();
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="dash-container">
            <header className="dash-header">
                <div>
                    <h1 style={{margin:0}}>MICROSOC COMMAND CENTER</h1>
                    <small>Operator: {user.name} | Role: {user.role}</small>
                </div>
                <button onClick={logout} style={{background:'#374151', color:'white', border:'none',borderRadius:'8px', padding:'10px 20px'}}>LOGOUT</button>
            </header>

            {/* Dashboard [cite: 21, 22] */}
            <div className="grid">
                {/* Log Ingestion View [cite: 12] */}
                <div className="card">
                    <h3>Live Traffic Logs (Last 50)</h3>
                    <table>
                        <thead>
                            <tr><th>Time</th><th>Type</th><th>Target</th><th>Severity</th></tr>
                        </thead>
                        <tbody>
                            {data.logs.map(log => (
                                <tr key={log._id}>
                                    <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                                    <td>{log.attackType}</td>
                                    <td>{log.targetSystem}</td>
                                    <td><span className={`badge ${log.severity}`}>{log.severity}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Incident Management & Stats  */}
                <div>
                    <div className="card" style={{marginBottom: '20px'}}>
                        <h3>Threat Intel</h3>
                        <p>Active Incidents: <strong>{data.incidents.filter(i => i.status !== 'Resolved').length}</strong></p>
                        <p>Most Frequent Attacker: <span style={{color:'#DC2626'}}>{data.topAttacker._id}</span></p>
                    </div>

                    <div className="card">
                        <h3>Incident Response</h3>
                        {data.incidents.length === 0 ? <p>No Active Threats</p> : (
                            <table>
                                <thead><tr><th>Desc</th><th>Status</th><th>Action</th></tr></thead>
                                <tbody>
                                    {data.incidents.map(inc => (
                                        <tr key={inc._id}>
                                            <td style={{fontSize:'0.8rem'}}>{inc.description}</td>
                                            <td><span className={`badge ${inc.status === 'Resolved' ? 'Low' : 'Critical'}`}>{inc.status}</span></td>
                                            <td>
                                                {inc.status !== 'Resolved' && (
                                                    <button className="action-btn" onClick={() => resolveIncident(inc._id)}>Resolve</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                           </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;