import { useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useAppDispatch } from '../store/hooks';
import { authStart, authSuccess, authFailure, authLogout } from '../store/authSlice';
import { auth } from '../firebase/config';
import { formatUserWithProfile } from '../firebase/auth';

/**
 * Hook to manage Firebase authentication state synchronization with Redux
 * Session-only persistence (no cross-session persistence for now)
 */
export const useAuthState = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(authStart());

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        try {
          if (firebaseUser) {
            // User is signed in - get profile and update Redux
            const user = await formatUserWithProfile(firebaseUser);
            dispatch(authSuccess(user));
          } else {
            // User is signed out - clear Redux state (clean logout, not an error)
            dispatch(authLogout());
          }
        } catch (error) {
          console.error('Auth state error:', error);
          dispatch(authFailure(error instanceof Error ? error.message : 'Authentication failed'));
        }
      },
      (error) => {
        console.error('Auth state listener error:', error);
        dispatch(authFailure(error.message));
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [dispatch]);
};
