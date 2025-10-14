import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DebugPanel: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const debugInfo = {
    'User ID': user.uid,
    'Email': user.email || 'N/A',
    'Display Name': user.displayName || 'N/A',
    'Anonymous': user.isAnonymous ? 'Yes' : 'No',
    'Firebase Emulators': import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS !== 'false' ? 'Enabled' : 'Disabled',
    'Environment': import.meta.env.DEV ? 'Development' : 'Production',
  };

  const clearLocalStorage = () => {
    const confirmClear = window.confirm('This will clear all local storage and reload the page. Continue?');
    if (confirmClear) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      zIndex: 9999,
    }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          fontSize: '16px',
        }}
        title="Debug Info"
      >
        🐛
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          left: '0',
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: '250px',
          fontSize: '12px',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Debug Info</h3>
          
          {Object.entries(debugInfo).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '8px' }}>
              <strong>{key}:</strong> {value}
            </div>
          ))}
          
          <hr style={{ margin: '12px 0' }} />
          
          <button
            onClick={clearLocalStorage}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              width: '100%',
            }}
          >
            Clear Storage & Reload
          </button>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
