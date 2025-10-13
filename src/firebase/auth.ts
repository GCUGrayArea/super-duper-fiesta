import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from './config';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

// Convert Firebase User to our AuthUser interface
export const formatUser = (user: User): AuthUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  isAnonymous: user.isAnonymous,
});

// Sign in with email and password
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<AuthUser> => {
  try {
    const result: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return formatUser(result.user);
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUser> => {
  try {
    const result: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    
    // Update profile with display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    
    return formatUser(result.user);
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Sign in anonymously (guest login)
export const signInAnonymously = async (displayName?: string): Promise<AuthUser> => {
  try {
    const result: UserCredential = await signInAnonymously(auth);
    
    // Update profile with display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    
    return formatUser(result.user);
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw error;
  }
};

// Sign out user
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};
