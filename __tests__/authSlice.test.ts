import { describe, it, expect, beforeEach } from 'vitest';
import authReducer, {
  authStart,
  authSuccess,
  authFailure,
  authLogout,
  updateUserProfile,
  clearAuthError,
  setAuthLoading,
  type AuthState,
  type User,
} from '../src/store/authSlice';

describe('Auth Slice', () => {
  let initialState: AuthState;
  let mockUser: User;

  beforeEach(() => {
    initialState = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      sessionOnly: true,
    };

    mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      color: 'crimson',
      createdAt: 1640995200000, // Jan 1, 2022
      lastLoginAt: 1640995200000,
    };
  });

  describe('authStart', () => {
    it('should set loading to true and clear error', () => {
      const stateWithError = { ...initialState, error: 'Previous error' };
      const result = authReducer(stateWithError, authStart());

      expect(result.isLoading).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('authSuccess', () => {
    it('should set user, authenticated true, loading false, and clear error', () => {
      const loadingState = { ...initialState, isLoading: true };
      const result = authReducer(loadingState, authSuccess(mockUser));

      expect(result.user).toEqual(mockUser);
      expect(result.isAuthenticated).toBe(true);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
    });
  });

  describe('authFailure', () => {
    it('should clear user, set authenticated false, loading false, and set error', () => {
      const authenticatedState = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
        isLoading: true,
      };
      
      const errorMessage = 'Authentication failed';
      const result = authReducer(authenticatedState, authFailure(errorMessage));

      expect(result.user).toBeNull();
      expect(result.isAuthenticated).toBe(false);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBe(errorMessage);
    });
  });

  describe('authLogout', () => {
    it('should reset all auth state to initial values', () => {
      const authenticatedState = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
        error: 'Some error',
      };

      const result = authReducer(authenticatedState, authLogout());

      expect(result.user).toBeNull();
      expect(result.isAuthenticated).toBe(false);
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile when user exists', () => {
      const authenticatedState = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
      };

      const updates = { displayName: 'Updated Name', color: 'hotpink' as const };
      const result = authReducer(authenticatedState, updateUserProfile(updates));

      expect(result.user).toEqual({
        ...mockUser,
        ...updates,
      });
    });

    it('should not crash when no user exists', () => {
      const updates = { displayName: 'Updated Name' };
      const result = authReducer(initialState, updateUserProfile(updates));

      expect(result.user).toBeNull();
    });
  });

  describe('clearAuthError', () => {
    it('should clear error while preserving other state', () => {
      const stateWithError = {
        ...initialState,
        user: mockUser,
        isAuthenticated: true,
        error: 'Some error',
      };

      const result = authReducer(stateWithError, clearAuthError());

      expect(result.error).toBeNull();
      expect(result.user).toEqual(mockUser);
      expect(result.isAuthenticated).toBe(true);
    });
  });

  describe('setAuthLoading', () => {
    it('should set loading state', () => {
      const result = authReducer(initialState, setAuthLoading(true));
      expect(result.isLoading).toBe(true);

      const result2 = authReducer(result, setAuthLoading(false));
      expect(result2.isLoading).toBe(false);
    });
  });
});
