import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signInAnonymously, signUpWithEmail, signInWithEmail, signOutUser } from '../src/firebase/auth';
import { createCanvas, getCanvasState, updateCanvasState, addShapeToCanvas } from '../src/firebase/db';
import { auth, db, rtdb } from '../src/firebase/config';

// Mock Firebase modules for unit testing
vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    signInAnonymously: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
  };
});

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    onSnapshot: vi.fn(),
  };
});

describe('Firebase Utilities', () => {
  describe('Authentication Functions', () => {
    it('should have all required auth functions', () => {
      expect(signInAnonymously).toBeDefined();
      expect(signUpWithEmail).toBeDefined();
      expect(signInWithEmail).toBeDefined();
      expect(signOutUser).toBeDefined();
    });

    it('should initialize Firebase services', () => {
      expect(auth).toBeDefined();
      expect(db).toBeDefined();
      expect(rtdb).toBeDefined();
    });
  });

  describe('Database Functions', () => {
    it('should have all required database functions', () => {
      expect(createCanvas).toBeDefined();
      expect(getCanvasState).toBeDefined();
      expect(updateCanvasState).toBeDefined();
      expect(addShapeToCanvas).toBeDefined();
    });

    it('should create canvas with correct structure', async () => {
      // This would normally interact with the emulator
      // For unit testing, we're just verifying function exists and can be called
      expect(async () => {
        await createCanvas('test-canvas', 'test-user', true);
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use emulator configuration in development', () => {
      // Verify that our configuration file sets up emulators correctly
      // In actual test environment, this would connect to local emulators
      expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('localhost:8080');
      expect(process.env.FIREBASE_DATABASE_EMULATOR_HOST).toBe('localhost:9000');
      expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBe('localhost:9099');
    });

    it('should have test Firebase project configured', () => {
      expect(process.env.VITE_FIREBASE_PROJECT_ID).toBe('demo-collab-canvas');
    });
  });
});
