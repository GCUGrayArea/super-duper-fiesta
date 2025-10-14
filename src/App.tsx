import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import CanvasPage from './pages/CanvasPage';
import Navbar from './components/Navbar';
import PresenceList from './components/PresenceList';
import LogoutButton from './components/LogoutButton';
import DebugPanel from './components/DebugPanel';
import './App.css';

// Canvas ID for now - in a real app this would come from routing
const CANVAS_ID = 'default-canvas';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  const handleLogin = () => {
    // Login handled by AuthContext, component will re-render
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <LogoutButton />
      <DebugPanel />
      <main className="main-content">
        <CanvasPage />
        <PresenceList canvasId={CANVAS_ID} />
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
