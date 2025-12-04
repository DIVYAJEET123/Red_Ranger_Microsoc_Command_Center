import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { Shield, AlertTriangle, Activity, CheckCircle } from 'lucide-react'; // Icons

// Connect to Backend
const socket = io('http://localhost:5000');

const App = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ critical: 0, total: 0 });

  useEffect(() => {
    // Listen for live attacks 
    socket.on('new_log', (log) => {
      setLogs((prev) => [log, ...prev].slice(0, 50)); // Keep latest 50
    });

    return () => socket.off('new_log');
  }, []);

  // Update stats whenever logs change
  useEffect(() => {
    const criticalCount = logs.filter(l => l.severity === 'Critical').length;
    setStats({ critical: criticalCount, total: logs.length });
  }, [logs]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #E60000' }}>
        <Shield size={48} color="#E60000" />
        <div style={{ marginLeft: '15px' }}>
          <h1 style={{ margin: 0, textTransform: 'uppercase' }}>Red Ranger MicroSOC</h1>
          <p style={{ margin: 0, color: '#888' }}>Morphin Grid Status: <span style={{ color: stats.critical > 0 ? 'red' : 'green' }}>{stats.critical > 0 ? 'UNDER ATTACK' : 'STABLE'}</span></p>
        </div>
      </header>

      {/* Stats Row  */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div className="panel">
          <Activity size={24} />
          <h3>Active Threats</h3>
          <p style={{ fontSize: '2em', margin: 0 }}>{logs.length}</p>
        </div>
        <div className="panel">
          <AlertTriangle size={24} color="red" />
          <h3>Critical Incidents</h3>
          <p style={{ fontSize: '2em', margin: 0, color: 'red' }}>{stats.critical}</p>
        </div>
        <div className="panel">
          <CheckCircle size={24} color="green" />
          <h3>System Integrity</h3>
          <p style={{ fontSize: '2em', margin: 0 }}>{Math.max(100 - (stats.critical * 5), 0)}%</p>
        </div>
      </div>

      {/* Live Log Stream [cite: 15, 25] */}
      <h2 style={{ borderLeft: '5px solid gold', paddingLeft: '10px' }}>Incoming Attack Signatures</h2>
      <div style={{ background: '#000', padding: '10px', height: '400px', overflowY: 'scroll', border: '1px solid #333' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ color: '#888', borderBottom: '1px solid #333' }}>
            <tr>
              <th>Time</th>
              <th>Severity</th>
              <th>Type</th>
              <th>Source IP</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #222', fontFamily: 'monospace' }}>
                <td style={{ padding: '8px' }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                <td className={`severity-${log.severity}`}>{log.severity.toUpperCase()}</td>
                <td>{log.type}</td>
                <td>{log.source_ip}</td>
                <td>{log.target_system}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;