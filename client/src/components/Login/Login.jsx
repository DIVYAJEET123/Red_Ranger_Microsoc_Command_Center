import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
    const { login } = useAuth();
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        // Simulating a "Security Scan" delay for effect
        setTimeout(async () => {
            const success = await login(form.username, form.password);
            if (!success) {
                setError('ACCESS DENIED: UNAUTHORIZED SIGNATURE');
                setLoading(false);
            }
        }, 1000);
    };

    return (
        <div className="login-container">
            {/* Animated Background Grid representing the Morphin Grid [cite: 6] */}
            <div className="grid-bg"></div>
            
            {/* Holographic Scanner Effect */}
            <div className="scan-line"></div>

            <div className="login-terminal">
                <div className="terminal-header">
                    <div className="ranger-coin">⚡</div>
                    <div>
                        <h2>COMMAND CENTER</h2>
                        <p className="sub-text">SECURE UPLINK: <span className="blink">ACTIVE</span></p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>RANGER ID</label>
                        <input 
                            type="text" 
                            value={form.username}
                            onChange={e => setForm({...form, username: e.target.value})}
                            placeholder="Enter Identity..."
                            autoComplete="off"
                        />
                        <div className="input-bar"></div>
                    </div>

                    <div className="input-group">
                        <label>ACCESS CODE</label>
                        <input 
                            type="password" 
                            value={form.password}
                            onChange={e => setForm({...form, password: e.target.value})}
                            placeholder="••••••••"
                        />
                        <div className="input-bar"></div>
                    </div>

                    {error && <div className="error-msg">⚠️ {error}</div>}

                    <button type="submit" className={`morph-btn ${loading ? 'processing' : ''}`} disabled={loading}>
                        {loading ? 'AUTHENTICATING...' : 'INITIATE MORPHIN SEQUENCE'}
                    </button>
                </form>

                <div className="quick-access-panel">
                    <p>DEBUG KEYPAD (DEMO):</p>
                    <div className="qa-buttons">
                        <button onClick={() => setForm({username:'admin', password:'admin123'})} className="qa-key red">
                            RED RANGER
                        </button>
                        <button onClick={() => setForm({username:'analyst', password:'analyst123'})} className="qa-key blue">
                            BLUE RANGER
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;