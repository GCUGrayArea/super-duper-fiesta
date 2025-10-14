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
  onValue,
  onDisconnect,
  Unsubscribe as RTDBUnsubscribe,
} from 'firebase/database';
import { db, rtdb } from './config';
import { AuthUser } from './auth';

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
  lockedBy?: string;
  lockedAt?: Timestamp;
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

// Presence interface for online users
export interface UserPresence {
  uid: string;
  displayName: string | null;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
  lastSeen: number;
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

// Lock/unlock shape
export const lockShape = async (
  canvasId: string,
  shapeId: string,
  userId: string
): Promise<void> => {
  try {
    await updateCanvasState(canvasId, {
      [`shapes.${shapeId}.lockedBy`]: userId,
      [`shapes.${shapeId}.lockedAt`]: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error locking shape:', error);
    throw error;
  }
};

export const unlockShape = async (
  canvasId: string,
  shapeId: string
): Promise<void> => {
  try {
    await updateCanvasState(canvasId, {
      [`shapes.${shapeId}.lockedBy`]: null,
      [`shapes.${shapeId}.lockedAt`]: null,
    });
  } catch (error) {
    console.error('Error unlocking shape:', error);
    throw error;
  }
};

// Presence tracking using Realtime Database
export const subscribeToPresence = (
  canvasId: string,
  user: AuthUser,
  userColor: string,
  callback: (users: { [uid: string]: UserPresence }) => void
): RTDBUnsubscribe => {
  const presenceRef = ref(rtdb, `presence/${canvasId}`);
  const userPresenceRef = ref(rtdb, `presence/${canvasId}/${user.uid}`);
  
  // Set user as online
  const userPresence: UserPresence = {
    uid: user.uid,
    displayName: user.displayName || `User ${user.uid.slice(0, 6)}`,
    color: userColor,
    lastSeen: Date.now(),
  };
  
  set(userPresenceRef, userPresence);
  
  // Set up disconnect cleanup
  onDisconnect(userPresenceRef).remove();
  
  // Listen to all users' presence
  return onValue(presenceRef, (snapshot) => {
    const users = snapshot.val() || {};
    callback(users);
  });
};

// Update user cursor position
export const updateCursorPosition = async (
  canvasId: string,
  userId: string,
  x: number,
  y: number
): Promise<void> => {
  try {
    const cursorRef = ref(rtdb, `presence/${canvasId}/${userId}/cursor`);
    await set(cursorRef, { x, y });
  } catch (error) {
    console.error('Error updating cursor position:', error);
  }
};

// Remove user from presence
export const removeUserPresence = async (
  canvasId: string,
  userId: string
): Promise<void> => {
  try {
    const userPresenceRef = ref(rtdb, `presence/${canvasId}/${userId}`);
    await set(userPresenceRef, null);
  } catch (error) {
    console.error('Error removing user presence:', error);
  }
};
