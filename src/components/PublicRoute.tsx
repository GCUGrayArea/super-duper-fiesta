import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated, selectIsAuthLoading } from '../store/authSlice';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for public pages (login/signup)
 * Redirects to canvas if user is already authenticated
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsAuthLoading);

  // Show loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to canvas if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/canvas" replace />;
  }

  // Render public content (login/signup)
  return <>{children}</>;
};
