import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  // Show loading state while validating token
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0b1a2e 0%, #1a2a4a 50%, #0d2137 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loader-book">
            <div className="loader-book-spine"></div>
            <div className="loader-book-page left"></div>
            <div className="loader-book-page right flipping"></div>
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, color: '#fff', marginTop: '1rem' }}>
            VERIFYING SESSION
          </h2>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return children;
}