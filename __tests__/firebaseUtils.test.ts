import { describe, it, expect, beforeEach } from 'vitest';
import { signInAnonymously, signOutUser } from '../src/firebase/auth';
import { createCanvas, getCanvasState } from '../src/firebase/db';

describe('Firebase Utils', () => {
  beforeEach(() => {
    // Reset auth state before each test
  });

  describe('Auth Functions', () => {
    it('should sign in anonymously', async () => {
      const user = await signInAnonymously('Test User');
      expect(user).toBeDefined();
      expect(user.isAnonymous).toBe(true);
      expect(user.displayName).toBe('Test User');
    });

    it('should sign out user', async () => {
      await signInAnonymously('Test User');
      await expect(signOutUser()).resolves.not.toThrow();
    });
  });

  describe('Database Functions', () => {
    it('should create and retrieve canvas', async () => {
      const canvasId = 'test-canvas-' + Date.now();
      const ownerId = 'test-user-123';
      
      // Create canvas
      await createCanvas(canvasId, ownerId, true);
      
      // Retrieve canvas
      const canvasState = await getCanvasState(canvasId);
      
      expect(canvasState).toBeDefined();
      expect(canvasState?.id).toBe(canvasId);
      expect(canvasState?.ownerId).toBe(ownerId);
      expect(canvasState?.isPermanent).toBe(true);
      expect(canvasState?.shapes).toEqual({});
    });

    it('should return null for non-existent canvas', async () => {
      const canvasState = await getCanvasState('non-existent-canvas');
      expect(canvasState).toBeNull();
    });
  });
});
