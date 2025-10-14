import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

// Connect to emulators in development (set VITE_USE_EMULATORS=false to disable)
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS !== 'false') {
  console.log('🔧 Using Firebase Emulators for development');
  
  try {
    // Connect to Auth emulator (only if not already connected)
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.log('✅ Connected to Auth Emulator');
    }
  } catch (error) {
    console.log('⚠️ Auth emulator already connected or not available:', error);
  }

  try {
    // Connect to Firestore emulator
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('✅ Connected to Firestore Emulator');
  } catch (error) {
    console.log('⚠️ Firestore emulator already connected or not available:', error);
  }

  try {
    // Connect to Realtime Database emulator
    connectDatabaseEmulator(rtdb, 'localhost', 9000);
    console.log('✅ Connected to Realtime Database Emulator');
  } catch (error) {
    console.log('⚠️ Realtime Database emulator already connected or not available:', error);
  }
} else if (import.meta.env.DEV) {
  console.log('🌐 Using Production Firebase (emulators disabled)');
} else {
  console.log('🚀 Using Production Firebase');
}

export default app;
