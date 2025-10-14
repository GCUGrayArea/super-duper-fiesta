import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated, selectIsAuthLoading } from '../store/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard that requires authentication
 * Redirects to login page if user is not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
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

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render protected content
  return <>{children}</>;
};
