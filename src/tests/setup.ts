import { beforeAll, afterAll } from 'vitest';

// Setup emulator environment variables for testing
beforeAll(() => {
  // Set environment variables for Firebase emulators
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = 'localhost:9000';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  
  // Set test Firebase config
  process.env.VITE_FIREBASE_PROJECT_ID = 'demo-collab-canvas';
  process.env.VITE_FIREBASE_API_KEY = 'demo-key';
  process.env.VITE_FIREBASE_AUTH_DOMAIN = 'demo-collab-canvas.firebaseapp.com';
  process.env.VITE_FIREBASE_STORAGE_BUCKET = 'demo-collab-canvas.appspot.com';
  process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '123456789';
  process.env.VITE_FIREBASE_APP_ID = '1:123456789:web:abcdef123456';
});

afterAll(() => {
  // Clean up environment variables after tests
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
});
