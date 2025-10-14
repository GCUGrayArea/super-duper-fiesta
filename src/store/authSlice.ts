import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// User interface based on Firebase Auth + our additional profile data
export interface User {
  uid: string;
  email: string; // Always required - no anonymous users
  displayName: string | null; // Optional, falls back to email in UI
  color: string; // Calculated color based on email hash
  createdAt: number;
  lastLoginAt: number;
}

// Authentication state interface
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  // NOTE: Current session persistence only - subject to change for cross-session persistence
  sessionOnly: boolean;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  sessionOnly: true, // Current session only - may change to support persistence later
};

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Start authentication process (loading state)
    authStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    // Authentication success - set user data
    authSuccess: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
    },

    // Authentication failure - set error
    authFailure: (state, action: PayloadAction<string>) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = action.payload;
    },

    // Update user profile (for display name changes, etc.)
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    // Logout - clear all auth state
    authLogout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },

    // Clear auth error
    clearAuthError: (state) => {
      state.error = null;
    },

    // Set loading state manually if needed
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

// Export actions
export const {
  authStart,
  authSuccess,
  authFailure,
  updateUserProfile,
  authLogout,
  clearAuthError,
  setAuthLoading,
} = authSlice.actions;

// Selectors for easy access to auth state
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

// Export reducer as default  
export default authSlice.reducer;
