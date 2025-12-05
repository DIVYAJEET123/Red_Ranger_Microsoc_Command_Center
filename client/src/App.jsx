import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login/Login';
import Dashboard from './components/Dashboard/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent = () => {
    const { user } = useAuth();
    return user ? (
        <ProtectedRoute>
            <Dashboard />
        </ProtectedRoute>
    ) : <Login />;
};

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;