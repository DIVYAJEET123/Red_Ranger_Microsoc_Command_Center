import React from 'react';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    if (!user) return <div style={{color:'white', textAlign:'center', marginTop:'50px'}}>Access Denied. Please Login.</div>;
    return children;
};

export default ProtectedRoute;