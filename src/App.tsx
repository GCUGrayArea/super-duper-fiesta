import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { 
  LandingPage, 
  LoginPage, 
  SignupPage, 
  CanvasPage, 
  LogoutPage 
} from './pages';
import { useAuthState } from './hooks/useAuthState';
import './App.css';

function App() {
  // Initialize Firebase auth state synchronization
  useAuthState();

  return (
    <Router>
      <Routes>
        {/* Landing page - redirects based on auth status */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Public routes - redirect to canvas if authenticated */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          } 
        />
        
        {/* Protected routes - require authentication */}
        <Route 
          path="/canvas" 
          element={
            <ProtectedRoute>
              <CanvasPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Logout page - handles signout and redirect */}
        <Route path="/logout" element={<LogoutPage />} />
        
        {/* Catch all route - redirect to landing */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
