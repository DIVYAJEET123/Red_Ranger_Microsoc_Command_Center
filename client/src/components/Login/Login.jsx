import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
    const { login } = useAuth();
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(form.username, form.password);
        if (!success) setError('Access Denied');
    };

    return (
        <div className="login-page">
            <div className="shield-logo" style={{backgroundColor: '#DC2626'}}></div>
            <h1 style={{color:'white', marginBottom:'0'}}>MicroSOC Command Center</h1>
            <p style={{color:'#6B7280', marginBottom:'30px'}}>Morphin Grid Security System</p>

            <div className="login-card">
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Username</label>
                        <input 
                            type="text" 
                            placeholder="Enter username"
                            value={form.username}
                            onChange={e => setForm({...form, username: e.target.value})}
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            placeholder="Enter password"
                            value={form.password}
                            onChange={e => setForm({...form, password: e.target.value})}
                        />
                    </div>
                    {error && <p style={{color:'#DC2626', fontSize:'0.9rem'}}>{error}</p>}
                    <button type="submit" className="login-btn">Access Command Center</button>
                </form>

                <div className="quick-access">
                    <p style={{fontSize:'0.8rem', color:'#9CA3AF'}}>Quick Access (Demo):</p>
                    <button className="qa-btn" onClick={() => setForm({username:'admin', password:'admin123'})}>Admin Login</button>
                    <button className="qa-btn" onClick={() => setForm({username:'analyst', password:'analyst123'})}>Analyst Login</button>
                </div>
            </div>
        </div>
    );
};

export default Login;