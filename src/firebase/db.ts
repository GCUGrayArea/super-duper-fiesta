import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import {
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  Unsubscribe as RTDBUnsubscribe,
} from 'firebase/database';
import { db, rtdb } from './config';
import { User } from '../store/authSlice';

// Canvas shape interface
export interface CanvasShape {
  id: string;
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  createdBy: string;
  createdAt: Timestamp;
  // Phase 5: Lock system moved to out-of-scope for MVP
  // lockedBy?: string;
  // lockedAt?: Timestamp;
}

// Canvas state interface
export interface CanvasState {
  id: string;
  shapes: { [shapeId: string]: CanvasShape };
  ownerId: string | null;
  isPermanent: boolean;
  createdAt: Timestamp;
  lastModified: Timestamp;
}

// Presence interface for online users (Phase 5)
export interface UserPresence {
  uid: string;
  displayName: string;
  email: string;
  color: string; // Computed from email hash
  lastSeen: number; // Last cursor movement or activity
  lastActivity: number; // Last login or edit action timestamp
}

// Cursor position interface
export interface CursorPosition {
  x: number; // World coordinates
  y: number; // World coordinates
  timestamp: number; // When cursor was last updated
}

// Get canvas state from Firestore
export const getCanvasState = async (canvasId: string): Promise<CanvasState | null> => {
  try {
    const docRef = doc(db, 'canvases', canvasId);
    const docSnap: DocumentSnapshot = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as CanvasState;
    } else {
      console.log('No such canvas document!');
      return null;
    }
  } catch (error) {
    console.error('Error getting canvas state:', error);
    throw error;
  }
};

// Update canvas state in Firestore
export const updateCanvasState = async (
  canvasId: string,
  state: Partial<CanvasState>
): Promise<void> => {
  try {
    const docRef = doc(db, 'canvases', canvasId);
    const updateData = {
      ...state,
      lastModified: Timestamp.now(),
    };
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error updating canvas state:', error);
    throw error;
  }
};

// Create new canvas
export const createCanvas = async (
  canvasId: string,
  ownerId: string | null,
  isPermanent: boolean = true
): Promise<void> => {
  try {
    const canvasData: CanvasState = {
      id: canvasId,
      shapes: {},
      ownerId,
      isPermanent,
      createdAt: Timestamp.now(),
      lastModified: Timestamp.now(),
    };
    
    const docRef = doc(db, 'canvases', canvasId);
    await setDoc(docRef, canvasData);
  } catch (error) {
    console.error('Error creating canvas:', error);
    throw error;
  }
};

// Subscribe to canvas updates (real-time)
export const subscribeToCanvasUpdates = (
  canvasId: string,
  callback: (canvasState: CanvasState | null) => void
): Unsubscribe => {
  const docRef = doc(db, 'canvases', canvasId);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as CanvasState);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error in canvas subscription:', error);
  });
};

// Add shape to canvas
export const addShapeToCanvas = async (
  canvasId: string,
  shape: Omit<CanvasShape, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    const shapeId = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const shapeWithId: CanvasShape = {
      ...shape,
      id: shapeId,
      createdAt: Timestamp.now(),
    };
    
    await updateCanvasState(canvasId, {
      [`shapes.${shapeId}`]: shapeWithId,
    });
    
    return shapeId;
  } catch (error) {
    console.error('Error adding shape to canvas:', error);
    throw error;
  }
};

// Phase 5: Presence System with 15-minute activity window

// Add or update user presence (called on login or edit activity)
export const updateUserPresence = async (
  canvasId: string,
  user: User,
  userColor: string
): Promise<void> => {
  try {
    const userPresenceRef = ref(rtdb, `presence/${canvasId}/${user.uid}`);
    const now = Date.now();
    
    const userPresence: UserPresence = {
      uid: user.uid,
      displayName: user.displayName || user.email, // Use full email if no display name
      email: user.email,
      color: userColor,
      lastSeen: now,
      lastActivity: now, // Updated on login or edit actions
    };
    
    await set(userPresenceRef, userPresence);
  } catch (error) {
    console.error('Error updating user presence:', error);
    throw error;
  }
};

// Subscribe to presence updates for a canvas
export const subscribeToPresence = (
  canvasId: string,
  callback: (users: { [uid: string]: UserPresence }) => void
): RTDBUnsubscribe => {
  const presenceRef = ref(rtdb, `presence/${canvasId}`);
  
  return onValue(presenceRef, (snapshot) => {
    const users = snapshot.val() || {};
    // Filter will happen in Redux slice based on 15-minute window
    callback(users);
  });
};

// Update user's last activity timestamp (called on edit actions)
export const updateUserActivity = async (
  canvasId: string,
  userId: string
): Promise<void> => {
  try {
    const userPresenceRef = ref(rtdb, `presence/${canvasId}/${userId}`);
    const now = Date.now();
    
    // Update only the activity fields, don't overwrite the entire presence
    await update(userPresenceRef, {
      lastActivity: now,
      lastSeen: now,
    });
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
};

// Set up presence with disconnect cleanup
export const initializeUserPresence = (
  canvasId: string,
  user: User,
  userColor: string
): Promise<void> => {
  const userPresenceRef = ref(rtdb, `presence/${canvasId}/${user.uid}`);
  
  // Set up disconnect cleanup to remove user when they leave
  onDisconnect(userPresenceRef).remove();
  
  // Add user to presence
  return updateUserPresence(canvasId, user, userColor);
};

// Phase 5: Cursor Position Tracking (separate from presence)

// Update cursor position with disconnect cleanup
export const updateCursorPosition = async (
  canvasId: string,
  userId: string,
  x: number,
  y: number
): Promise<void> => {
  try {
    const cursorRef = ref(rtdb, `cursors/${canvasId}/${userId}`);
    const cursorData: CursorPosition = {
      x,
      y,
      timestamp: Date.now(),
    };
    
    // Set up disconnect cleanup for cursor (remove on disconnect)
    onDisconnect(cursorRef).remove();
    
    await set(cursorRef, cursorData);
    
    // Also update lastSeen in presence
    const userPresenceRef = ref(rtdb, `presence/${canvasId}/${userId}`);
    await update(userPresenceRef, { lastSeen: Date.now() });
  } catch (error) {
    console.error('❌ Error updating cursor position:', error);
    throw error;
  }
};

// Subscribe to cursor positions for a canvas
export const subscribeToCursors = (
  canvasId: string,
  callback: (cursors: { [uid: string]: CursorPosition }) => void
): RTDBUnsubscribe => {
  const cursorsRef = ref(rtdb, `cursors/${canvasId}`);
  
  return onValue(cursorsRef, (snapshot) => {
    const cursors = snapshot.val() || {};
    callback(cursors);
  }, (error) => {
    console.error('Firebase cursor subscription error:', error);
  });
};

// Remove user from presence and cursor tracking
export const removeUserPresence = async (
  canvasId: string,
  userId: string
): Promise<void> => {
  try {
    const userPresenceRef = ref(rtdb, `presence/${canvasId}/${userId}`);
    const cursorRef = ref(rtdb, `cursors/${canvasId}/${userId}`);
    
    // Remove both presence and cursor data
    await Promise.all([
      set(userPresenceRef, null),
      set(cursorRef, null)
    ]);
  } catch (error) {
    console.error('Error removing user presence:', error);
  }
};
