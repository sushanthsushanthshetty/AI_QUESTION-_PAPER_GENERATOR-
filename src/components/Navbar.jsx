import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Settings, BookOpen, History, Layers } from 'lucide-react';

export default function Navbar({ currentPage, setPage }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleNavClick = (page) => {
    if (page === 'answer-key') {
      navigate('/answer-key');
    } else if (currentPage === 'profile' || currentPage === 'answer-key') {
      navigate('/dashboard', { state: { defaultPage: page } });
    } else if (setPage) {
      setPage(page);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">QP</div>
        <div className="logo-text" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <h2>MVIT Generator</h2>
          <p>Academic Rigor AI</p>
        </div>
      </div>

      {user && (
        <div className="sidebar-user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="View Profile">
          <div className="user-avatar">
            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
          </div>
          <div className="user-info">
            <span className="user-name">{user.firstName} {user.lastName}</span>
            <span className="user-id">{user.teacherId}</span>
          </div>
        </div>
      )}

      <div className="nav-menu">
        <div 
          className={`nav-item ${currentPage === 'create' ? 'active' : ''}`} 
          onClick={() => handleNavClick('create')}
        >
          <BookOpen size={18} />
          <span>Create Paper</span>
        </div>
        {currentPage === 'editor' && (
          <div className="nav-item active">
            <BookOpen size={18} />
            <span>Editing Paper</span>
          </div>
        )}
        <div 
          className={`nav-item ${currentPage === 'history' ? 'active' : ''}`} 
          onClick={() => handleNavClick('history')}
        >
          <History size={18} />
          <span>Saved Papers</span>
        </div>
        <div 
          className={`nav-item ${currentPage === 'answer-key' ? 'active' : ''}`} 
          onClick={() => handleNavClick('answer-key')}
        >
          <Layers size={18} />
          <span>Answer Key</span>
        </div>
        <div 
          className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`} 
          onClick={() => handleNavClick('settings')}
        >
          <Settings size={18} />
          <span>AI Configurations</span>
        </div>
        <div 
          className={`nav-item ${currentPage === 'profile' ? 'active' : ''}`} 
          onClick={() => navigate('/profile')}
        >
          <User size={18} />
          <span>My Profile</span>
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
        <div className="api-status">
          <span>Inception API status</span>
          <span className="status-dot active" />
        </div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          Powered by Mercury-Coder-Small | v1.0
        </div>
      </div>
    </div>
  );
}