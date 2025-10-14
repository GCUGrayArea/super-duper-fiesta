import React, { useState } from 'react';
import { signInAnonymously } from '../firebase/auth';

interface GuestLoginProps {
  onLogin: () => void;
}

const GuestLogin: React.FC<GuestLoginProps> = ({ onLogin }) => {
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInAnonymously(guestName || undefined);
      onLogin();
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="guest-login">
      <h2>Continue as Guest</h2>
      <p className="guest-description">
        Start drawing immediately without creating an account
      </p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleGuestLogin} className="guest-form">
        <div className="form-group">
          <label htmlFor="guestName">Display Name (optional)</label>
          <input
            type="text"
            id="guestName"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Enter a display name"
          />
        </div>
        
        <button 
          type="submit" 
          className="guest-btn"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Continue as Guest'}
        </button>
      </form>
      
      <p className="guest-note">
        Note: Guest sessions are temporary and may be lost after 15 minutes of inactivity.
      </p>
    </div>
  );
};

export default GuestLogin;
