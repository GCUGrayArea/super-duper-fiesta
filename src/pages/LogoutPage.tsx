import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../store/authSlice';
import { signOutUser } from '../firebase/auth';

/**
 * Logout page that handles user signout and redirects
 */
export const LogoutPage: React.FC = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Sign out from Firebase - useAuthState hook will handle Redux state automatically
        await signOutUser();
      } catch (error) {
        console.error('Logout error:', error);
        // useAuthState hook will still detect the auth state change
      }
    };

    // Only logout if user is currently authenticated
    if (isAuthenticated) {
      handleLogout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - isAuthenticated changes are handled by redirect

  // If user is no longer authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Show loading state while logging out
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg text-gray-600 mb-2">Signing out...</div>
        <div className="text-sm text-gray-400">Please wait</div>
      </div>
    </div>
  );
};
