import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../store/authSlice';

/**
 * Landing page that redirects based on authentication status
 * - Authenticated users: redirect to /canvas
 * - Unauthenticated users: redirect to /login
 */
export const LandingPage: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  // Redirect to appropriate page based on auth status
  if (isAuthenticated) {
    return <Navigate to="/canvas" replace />;
  }

  return <Navigate to="/login" replace />;
};
