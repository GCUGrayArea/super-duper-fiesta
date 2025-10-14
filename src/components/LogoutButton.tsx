import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/logout-button.css';

const LogoutButton: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    const confirmLogout = window.confirm('Are you sure you want to sign out?');
    if (!confirmLogout) return;

    setIsLoggingOut(true);
    try {
      await signOut();
      console.log('✅ Successfully signed out');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      alert('Error signing out. Please try again.');
    } finally {
      setIsLoggingOut(false);
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

  return (
    <div className="logout-button-container">
      <div className="user-info-compact">
        <span className="user-name-compact">{getUserDisplayName()}</span>
        {user.isAnonymous && (
          <span className="user-badge-compact guest">Guest</span>
        )}
        {user.email && !user.isAnonymous && (
          <span className="user-badge-compact registered">Account</span>
        )}
      </div>
      
      <button 
        className={`logout-btn ${isLoggingOut ? 'logging-out' : ''}`}
        onClick={handleSignOut}
        disabled={isLoggingOut}
        title="Sign out of your account"
      >
        {isLoggingOut ? (
          <>
            <span className="spinner"></span>
            Signing out...
          </>
        ) : (
          <>
            <span className="logout-icon">🚪</span>
            Sign Out
          </>
        )}
      </button>
    </div>
  );
};

export default LogoutButton;
