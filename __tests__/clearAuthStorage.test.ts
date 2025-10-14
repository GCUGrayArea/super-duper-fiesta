import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearFirebaseAuthStorage } from '../src/utils/clearAuthStorage';

// Mock console methods to avoid noise in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
  keys: vi.fn(),
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(), 
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
  keys: vi.fn(),
};

// Mock Object.keys for localStorage and sessionStorage
const originalObjectKeys = Object.keys;

describe('Clear Auth Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mocks
    mockLocalStorage.removeItem.mockClear();
    mockLocalStorage.clear.mockClear();
    mockSessionStorage.removeItem.mockClear();
    mockSessionStorage.clear.mockClear();
    
    // Mock global localStorage and sessionStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
    
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  it('should remove Firebase auth keys from localStorage', () => {
    const mockKeys = [
      'firebase:authUser:AIzaSyA:app',
      'firebase:host:project-id',
      'firebase:heartbeat:project-id',
      'firebaseui:sessionData',
      'regular-key',
      'another-regular-key',
    ];

    // Mock Object.keys to return our test keys
    vi.spyOn(Object, 'keys').mockImplementation((obj) => {
      if (obj === mockLocalStorage) return mockKeys;
      if (obj === mockSessionStorage) return [];
      return originalObjectKeys(obj);
    });

    clearFirebaseAuthStorage();

    // Should remove Firebase-related keys
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebase:authUser:AIzaSyA:app');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebase:host:project-id');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebase:heartbeat:project-id');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebaseui:sessionData');

    // Should not remove non-Firebase keys
    expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('regular-key');
    expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('another-regular-key');
  });

  it('should remove Firebase auth keys from sessionStorage', () => {
    const mockLocalStorageKeys: string[] = [];
    const mockSessionStorageKeys = [
      'firebase:authUser:session',
      'firebase:host:session',
      'regular-session-key',
    ];

    vi.spyOn(Object, 'keys').mockImplementation((obj) => {
      if (obj === mockLocalStorage) return mockLocalStorageKeys;
      if (obj === mockSessionStorage) return mockSessionStorageKeys;
      return originalObjectKeys(obj);
    });

    clearFirebaseAuthStorage();

    // Should remove Firebase-related keys from sessionStorage
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('firebase:authUser:session');
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('firebase:host:session');

    // Should not remove non-Firebase keys
    expect(mockSessionStorage.removeItem).not.toHaveBeenCalledWith('regular-session-key');
  });

  it('should use nuclear clear when Firebase keys remain after removal', () => {
    const persistentKeys = ['firebase:persistent:key'];
    let callCount = 0;

    vi.spyOn(Object, 'keys').mockImplementation((obj) => {
      if (obj === mockLocalStorage) {
        callCount++;
        // First call returns Firebase keys, second call (after removal) still returns them
        return callCount === 1 ? persistentKeys : persistentKeys;
      }
      if (obj === mockSessionStorage) return [];
      return originalObjectKeys(obj);
    });

    clearFirebaseAuthStorage();

    // Should attempt nuclear clear when keys persist
    expect(mockLocalStorage.clear).toHaveBeenCalled();
    expect(mockSessionStorage.clear).toHaveBeenCalled();
  });

  it('should not use nuclear clear when all Firebase keys are removed', () => {
    const initialKeys = ['firebase:authUser:test'];
    let callCount = 0;

    vi.spyOn(Object, 'keys').mockImplementation((obj) => {
      if (obj === mockLocalStorage) {
        callCount++;
        // First call returns Firebase keys, second call (after removal) returns empty
        return callCount === 1 ? initialKeys : [];
      }
      if (obj === mockSessionStorage) return [];
      return originalObjectKeys(obj);
    });

    clearFirebaseAuthStorage();

    // Should not use nuclear clear when keys are successfully removed
    expect(mockLocalStorage.clear).not.toHaveBeenCalled();
    expect(mockSessionStorage.clear).not.toHaveBeenCalled();
  });

  it('should handle localStorage errors gracefully', () => {
    const mockKeys = ['firebase:authUser:test'];
    
    vi.spyOn(Object, 'keys').mockImplementation((obj) => {
      if (obj === mockLocalStorage) return mockKeys;
      if (obj === mockSessionStorage) return [];
      return originalObjectKeys(obj);
    });

    // Mock removeItem to throw error
    mockLocalStorage.removeItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    // Should not throw, should handle error gracefully
    expect(() => clearFirebaseAuthStorage()).not.toThrow();
  });

  it('should handle sessionStorage errors gracefully', () => {
    const mockKeys = ['firebase:test'];
    
    vi.spyOn(Object, 'keys').mockImplementation((obj) => {
      if (obj === mockLocalStorage) return [];
      if (obj === mockSessionStorage) return mockKeys;
      return originalObjectKeys(obj);
    });

    // Mock removeItem to throw error
    mockSessionStorage.removeItem.mockImplementation(() => {
      throw new Error('sessionStorage error');
    });

    // Should not throw, should handle error gracefully
    expect(() => clearFirebaseAuthStorage()).not.toThrow();
  });

  it('should handle nuclear clear errors gracefully', () => {
    const persistentKeys = ['firebase:persistent'];
    
    vi.spyOn(Object, 'keys').mockImplementation((obj) => {
      if (obj === mockLocalStorage) return persistentKeys;
      if (obj === mockSessionStorage) return [];
      return originalObjectKeys(obj);
    });

    // Mock clear to throw errors
    mockLocalStorage.clear.mockImplementation(() => {
      throw new Error('localStorage clear error');
    });
    mockSessionStorage.clear.mockImplementation(() => {
      throw new Error('sessionStorage clear error');
    });

    // Should handle errors gracefully
    expect(() => clearFirebaseAuthStorage()).not.toThrow();
    expect(mockConsoleError).toHaveBeenCalledWith('Could not clear localStorage:', expect.any(Error));
    expect(mockConsoleError).toHaveBeenCalledWith('Could not clear sessionStorage:', expect.any(Error));
  });

  it('should handle complete failure gracefully', () => {
    // Mock Object.keys to throw error
    vi.spyOn(Object, 'keys').mockImplementation(() => {
      throw new Error('Object.keys error');
    });

    // Should handle complete failure gracefully
    expect(() => clearFirebaseAuthStorage()).not.toThrow();
    expect(mockConsoleWarn).toHaveBeenCalledWith('Could not clear Firebase Auth storage:', expect.any(Error));
  });

  it('should handle different Firebase key patterns', () => {
    const diverseKeys = [
      'firebase:authUser:AIzaSyA:appName',
      'firebase:host:project-123',
      'firebase:heartbeat:app',
      'firebase:config:something',
      'firebaseui:widget',
      'firebase-heartbeat-store',
      'not-firebase-key',
      'prefixfirebase:key',
    ];

    vi.spyOn(Object, 'keys').mockImplementation((obj) => {
      if (obj === mockLocalStorage) return diverseKeys;
      if (obj === mockSessionStorage) return [];
      return originalObjectKeys(obj);
    });

    clearFirebaseAuthStorage();

    // Should remove all Firebase-related keys
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebase:authUser:AIzaSyA:appName');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebase:host:project-123');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebase:heartbeat:app');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebase:config:something');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebaseui:widget');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('firebase-heartbeat-store');

    // Should not remove non-Firebase keys
    expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('not-firebase-key');
    expect(mockLocalStorage.removeItem).not.toHaveBeenCalledWith('prefixfirebase:key');
  });
});
