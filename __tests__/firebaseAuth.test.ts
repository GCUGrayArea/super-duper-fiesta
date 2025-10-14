import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User as FirebaseUser, UserCredential } from 'firebase/auth';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  signOutUser, 
  formatUserWithProfile,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  type User
} from '../src/firebase/auth';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  setPersistence: vi.fn(),
  browserSessionPersistence: {},
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

// Mock Firebase config
vi.mock('../src/firebase/config', () => ({
  auth: {},
  db: {},
}));

// Mock color hash utility
vi.mock('../src/utils/colorHash', () => ({
  calculateUserColor: vi.fn(() => 'crimson'),
}));

// Mock clear auth storage
vi.mock('../src/utils/clearAuthStorage', () => ({
  clearFirebaseAuthStorage: vi.fn(),
}));

describe('Firebase Authentication', () => {
  let mockFirebaseUser: FirebaseUser;
  let mockUserCredential: UserCredential;
  let mockUser: User;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockFirebaseUser = {
      uid: 'firebase-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      reload: vi.fn(),
    } as unknown as FirebaseUser;

    mockUserCredential = {
      user: mockFirebaseUser,
      providerId: 'password',
      operationType: 'signIn',
    };

    mockUser = {
      uid: 'firebase-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      color: 'crimson',
      createdAt: 1640995200000,
      lastLoginAt: 1640995200000,
    };
  });

  describe('formatUserWithProfile', () => {
    it('should throw error when firebase user has no email', async () => {
      const userWithoutEmail = { ...mockFirebaseUser, email: null };
      
      await expect(formatUserWithProfile(userWithoutEmail)).rejects.toThrow('User email is required');
    });

    it('should create new profile when user profile does not exist', async () => {
      // Mock Firestore functions
      const { getDoc, setDoc } = await import('firebase/firestore');
      const { calculateUserColor } = await import('../src/utils/colorHash');
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);
      
      vi.mocked(setDoc).mockResolvedValue(undefined);
      vi.mocked(calculateUserColor).mockReturnValue('crimson');

      const result = await formatUserWithProfile(mockFirebaseUser);

      expect(result.uid).toBe(mockFirebaseUser.uid);
      expect(result.email).toBe(mockFirebaseUser.email);
      expect(result.displayName).toBe(mockFirebaseUser.displayName);
      expect(result.color).toBe('crimson');
      expect(result.createdAt).toBeDefined();
      expect(result.lastLoginAt).toBeDefined();
    });

    it('should return existing profile when user profile exists', async () => {
      const { getDoc, updateDoc } = await import('firebase/firestore');
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockUser,
      } as any);
      
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const result = await formatUserWithProfile(mockFirebaseUser);

      expect(result.uid).toBe(mockUser.uid);
      expect(result.email).toBe(mockUser.email);
    });
  });

  describe('signUpWithEmail', () => {
    it('should create user and profile successfully', async () => {
      const { createUserWithEmailAndPassword, updateProfile, setPersistence } = await import('firebase/auth');
      const { getDoc, setDoc } = await import('firebase/firestore');
      
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(mockUserCredential);
      vi.mocked(updateProfile).mockResolvedValue(undefined);
      vi.mocked(setPersistence).mockResolvedValue(undefined);
      vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      const result = await signUpWithEmail('test@example.com', 'password123', 'Test User');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com', 
        'password123'
      );
      expect(updateProfile).toHaveBeenCalledWith(
        mockFirebaseUser,
        { displayName: 'Test User' }
      );
      expect(result.email).toBe('test@example.com');
    });

    it('should create user without display name', async () => {
      const { createUserWithEmailAndPassword, updateProfile, setPersistence } = await import('firebase/auth');
      const { getDoc, setDoc } = await import('firebase/firestore');
      
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(mockUserCredential);
      vi.mocked(setPersistence).mockResolvedValue(undefined);
      vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      await signUpWithEmail('test@example.com', 'password123');

      expect(createUserWithEmailAndPassword).toHaveBeenCalled();
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('should handle errors properly', async () => {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      
      const error = new Error('Email already exists');
      vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(error);

      await expect(signUpWithEmail('test@example.com', 'password123')).rejects.toThrow('Email already exists');
    });
  });

  describe('signInWithEmail', () => {
    it('should sign in user successfully', async () => {
      const { signInWithEmailAndPassword, setPersistence } = await import('firebase/auth');
      const { getDoc, updateDoc } = await import('firebase/firestore');
      
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue(mockUserCredential);
      vi.mocked(setPersistence).mockResolvedValue(undefined);
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockUser,
      } as any);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const result = await signInWithEmail('test@example.com', 'password123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      );
      expect(result.email).toBe('test@example.com');
    });

    it('should handle login errors properly', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      
      const error = new Error('Invalid credentials');
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(error);

      await expect(signInWithEmail('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signOutUser', () => {
    it('should sign out successfully and clear storage', async () => {
      const { signOut } = await import('firebase/auth');
      const { clearFirebaseAuthStorage } = await import('../src/utils/clearAuthStorage');
      
      vi.mocked(signOut).mockResolvedValue(undefined);

      await signOutUser();

      expect(signOut).toHaveBeenCalled();
      expect(clearFirebaseAuthStorage).toHaveBeenCalled();
    });

    it('should clear storage even if signOut fails', async () => {
      const { signOut } = await import('firebase/auth');
      const { clearFirebaseAuthStorage } = await import('../src/utils/clearAuthStorage');
      
      const error = new Error('SignOut failed');
      vi.mocked(signOut).mockRejectedValue(error);

      await expect(signOutUser()).rejects.toThrow('SignOut failed');
      expect(clearFirebaseAuthStorage).toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile when it exists', async () => {
      const { getDoc } = await import('firebase/firestore');
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockUser,
      } as any);

      const result = await getUserProfile('test-user-123');
      expect(result).toEqual(mockUser);
    });

    it('should return null when profile does not exist', async () => {
      const { getDoc } = await import('firebase/firestore');
      
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await getUserProfile('non-existent-user');
      expect(result).toBeNull();
    });

    it('should handle errors properly', async () => {
      const { getDoc } = await import('firebase/firestore');
      
      const error = new Error('Database error');
      vi.mocked(getDoc).mockRejectedValue(error);

      await expect(getUserProfile('test-user-123')).rejects.toThrow('Database error');
    });
  });

  describe('createUserProfile', () => {
    it('should create user profile successfully', async () => {
      const { setDoc } = await import('firebase/firestore');
      
      vi.mocked(setDoc).mockResolvedValue(undefined);

      await expect(createUserProfile(mockUser)).resolves.not.toThrow();
      expect(setDoc).toHaveBeenCalled();
    });

    it('should handle errors properly', async () => {
      const { setDoc } = await import('firebase/firestore');
      
      const error = new Error('Database error');
      vi.mocked(setDoc).mockRejectedValue(error);

      await expect(createUserProfile(mockUser)).rejects.toThrow('Database error');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const { updateDoc } = await import('firebase/firestore');
      
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const updates = { displayName: 'Updated Name' };
      await expect(updateUserProfile('test-user-123', updates)).resolves.not.toThrow();
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should handle errors properly', async () => {
      const { updateDoc } = await import('firebase/firestore');
      
      const error = new Error('Database error');
      vi.mocked(updateDoc).mockRejectedValue(error);

      await expect(updateUserProfile('test-user-123', {})).rejects.toThrow('Database error');
    });
  });
});
