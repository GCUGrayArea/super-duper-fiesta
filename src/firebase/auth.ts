import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  setPersistence,
  browserSessionPersistence,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { auth, db } from './config';
import { User } from '../store/authSlice';
import { calculateUserColor } from '../utils/colorHash';
import { clearFirebaseAuthStorage } from '../utils/clearAuthStorage';

// Convert Firebase User to our User interface with Firestore profile data
export const formatUserWithProfile = async (firebaseUser: FirebaseUser): Promise<User> => {
  if (!firebaseUser.email) {
    throw new Error('User email is required');
  }

  // Get or create user profile in Firestore
  const userProfile = await getUserProfile(firebaseUser.uid);
  
  if (userProfile) {
    // Update last login time
    await updateUserProfile(firebaseUser.uid, { lastLoginAt: Date.now() });
    return { ...userProfile, lastLoginAt: Date.now() };
  }
  
  // Create new profile if doesn't exist
  const newUser: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    color: calculateUserColor(firebaseUser.email),
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };
  
  await createUserProfile(newUser);
  return newUser;
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        color: data.color,
        createdAt: data.createdAt,
        lastLoginAt: data.lastLoginAt,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Create user profile in Firestore
export const createUserProfile = async (user: User): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      color: user.color,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// Update user profile in Firestore
export const updateUserProfile = async (uid: string, updates: Partial<Omit<User, 'uid'>>): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, updates);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string
): Promise<User> => {
  try {
    // Ensure session-only persistence
    await setPersistence(auth, browserSessionPersistence);
    
    // Create Firebase Auth user
    const result: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    
    // Update Firebase profile with display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
      // Refresh the user object to get updated displayName
      await result.user.reload();
    }
    
    // Create Firestore profile and return formatted user
    return await formatUserWithProfile(result.user);
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Sign in with email and password  
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    // Ensure session-only persistence
    await setPersistence(auth, browserSessionPersistence);
    
    const result: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    
    // Get/update Firestore profile and return formatted user
    return await formatUserWithProfile(result.user);
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign out user
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    
    // Clear any remaining Firebase auth storage to ensure session-only behavior
    clearFirebaseAuthStorage();
  } catch (error) {
    console.error('Error signing out:', error);
    
    // Even if signOut fails, clear local storage
    clearFirebaseAuthStorage();
    throw error;
  }
};
