import React from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/navbar.css';

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserDisplayName = () => {
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.isAnonymous) {
      return `Guest ${user.uid.slice(0, 6)}`;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-brand">
          <h1>Collab Canvas</h1>
        </div>
        
        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{getUserDisplayName()}</span>
            {user.isAnonymous && (
              <span className="user-badge guest-badge">Guest</span>
            )}
            {user.email && !user.isAnonymous && (
              <span className="user-badge user-badge">Registered</span>
            )}
          </div>
          
          <button 
            className="sign-out-btn"
            onClick={handleSignOut}
            title="Sign out"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
