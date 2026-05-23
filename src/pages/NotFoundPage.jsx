import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="auth-header">
            <div className="auth-logo" style={{ margin: '0 auto 1.5rem' }}>
              <BookOpen size={48} />
            </div>
            <h1 style={{ fontSize: '4rem', color: 'var(--accent-gold)', margin: '0' }}>404</h1>
            <p style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>Page Not Found</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              The page you are looking for doesn't exist or has been moved.
            </p>
          </div>
          
          <button 
            className="btn btn-accent" 
            style={{ marginTop: '1.5rem' }}
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}