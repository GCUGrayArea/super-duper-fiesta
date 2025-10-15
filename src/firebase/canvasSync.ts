import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  DocumentSnapshot,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { CanvasDocument, CanvasObject } from '../types/canvas';

/**
 * Phase 4: Real-Time Canvas Synchronization
 * 
 * New Firebase utilities for canvas persistence and multiplayer sync.
 * These functions work with Phase 3 CanvasObject types and support
 * the echo prevention system with lastModifiedBy tracking.
 */

// Canvas document reference helper
function getCanvasDocRef(canvasId: string) {
  return doc(db, 'canvases', canvasId);
}

/**
 * Load canvas document from Firestore
 * @param canvasId - Canvas ID (e.g., "main" for MVP)
 * @returns Canvas document or null if not found
 */
export async function loadCanvas(canvasId: string): Promise<CanvasDocument | null> {
  try {
    const docRef = getCanvasDocRef(canvasId);
    const docSnap: DocumentSnapshot = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: canvasId,
        objects: data.objects || [],
        lastUpdated: data.lastUpdated?.toMillis() || Date.now(),
        createdBy: data.createdBy || '',
        createdAt: data.createdAt?.toMillis() || Date.now(),
      } as CanvasDocument;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading canvas:', error);
    throw error;
  }
}

/**
 * Create new canvas document in Firestore
 * @param canvasId - Canvas ID (e.g., "main" for MVP)
 * @param createdBy - User ID who created the canvas
 * @returns Promise that resolves when canvas is created
 */
export async function createCanvas(
  canvasId: string,
  createdBy: string
): Promise<void> {
  try {
    const docRef = getCanvasDocRef(canvasId);
    const now = Timestamp.now();
    
    const canvasData: Omit<CanvasDocument, 'id' | 'lastUpdated' | 'createdAt'> & {
      lastUpdated: Timestamp;
      createdAt: Timestamp;
    } = {
      objects: [],
      createdBy,
      lastUpdated: now,
      createdAt: now,
    };
    
    await setDoc(docRef, canvasData);
  } catch (error) {
    console.error('Error creating canvas:', error);
    throw error;
  }
}

/**
 * Update canvas objects in Firestore
 * @param canvasId - Canvas ID
 * @param objects - New array of canvas objects
 * @param userId - ID of user making the update (for lastUpdated tracking)
 * @returns Promise that resolves when update is complete
 */
export async function updateCanvasObjects(
  canvasId: string,
  objects: CanvasObject[],
  _userId: string
): Promise<void> {
  try {
    const docRef = getCanvasDocRef(canvasId);
    
    await updateDoc(docRef, {
      objects,
      lastUpdated: serverTimestamp(), // Use server timestamp for consistency
    });
  } catch (error) {
    console.error('Error updating canvas objects:', error);
    throw error;
  }
}

/**
 * Add object to canvas in Firestore
 * @param canvasId - Canvas ID
 * @param newObject - New object to add
 * @param existingObjects - Current objects array (to avoid race conditions)
 * @returns Promise that resolves when object is added
 */
export async function addObjectToCanvas(
  canvasId: string,
  newObject: CanvasObject,
  existingObjects: CanvasObject[]
): Promise<void> {
  try {
    const updatedObjects = [...existingObjects, newObject];
    await updateCanvasObjects(canvasId, updatedObjects, newObject.lastModifiedBy);
  } catch (error) {
    console.error('Error adding object to canvas:', error);
    throw error;
  }
}

/**
 * Update specific object in canvas
 * @param canvasId - Canvas ID
 * @param objectId - ID of object to update
 * @param updates - Partial object updates
 * @param userId - ID of user making the update
 * @param existingObjects - Current objects array
 * @returns Promise that resolves when object is updated
 */
export async function updateObjectInCanvas(
  canvasId: string,
  objectId: string,
  updates: Partial<CanvasObject>,
  userId: string,
  existingObjects: CanvasObject[]
): Promise<void> {
  try {
    const updatedObjects = existingObjects.map(obj => {
      if (obj.id === objectId) {
        return {
          ...obj,
          ...updates,
          updatedAt: Date.now(),
          lastModifiedBy: userId,
        };
      }
      return obj;
    });
    
    await updateCanvasObjects(canvasId, updatedObjects, userId);
  } catch (error) {
    console.error('Error updating object in canvas:', error);
    throw error;
  }
}

/**
 * Delete object from canvas
 * @param canvasId - Canvas ID
 * @param objectId - ID of object to delete
 * @param userId - ID of user making the deletion
 * @param existingObjects - Current objects array
 * @returns Promise that resolves when object is deleted
 */
export async function deleteObjectFromCanvas(
  canvasId: string,
  objectId: string,
  userId: string,
  existingObjects: CanvasObject[]
): Promise<void> {
  try {
    const updatedObjects = existingObjects.filter(obj => obj.id !== objectId);
    await updateCanvasObjects(canvasId, updatedObjects, userId);
  } catch (error) {
    console.error('Error deleting object from canvas:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time canvas updates
 * @param canvasId - Canvas ID to subscribe to
 * @param onUpdate - Callback fired when canvas updates
 * @param onError - Callback fired on subscription error
 * @returns Unsubscribe function
 */
export function subscribeToCanvas(
  canvasId: string,
  onUpdate: (canvas: CanvasDocument | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docRef = getCanvasDocRef(canvasId);
  
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const canvas: CanvasDocument = {
          id: canvasId,
          objects: data.objects || [],
          lastUpdated: data.lastUpdated?.toMillis() || Date.now(),
          createdBy: data.createdBy || '',
          createdAt: data.createdAt?.toMillis() || Date.now(),
        };
        onUpdate(canvas);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.error('Canvas subscription error:', error);
      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * Check if canvas exists in Firestore
 * @param canvasId - Canvas ID to check
 * @returns True if canvas exists, false otherwise
 */
export async function canvasExists(canvasId: string): Promise<boolean> {
  try {
    const docRef = getCanvasDocRef(canvasId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking canvas existence:', error);
    return false;
  }
}

/**
 * Initialize canvas if it doesn't exist (ensures "main" canvas is available)
 * @param canvasId - Canvas ID to initialize
 * @param userId - User ID who will be the creator
 * @returns Promise that resolves when canvas is ready
 */
export async function ensureCanvasExists(
  canvasId: string,
  userId: string
): Promise<void> {
  try {
    const exists = await canvasExists(canvasId);
    if (!exists) {
      await createCanvas(canvasId, userId);
    }
  } catch (error) {
    console.error('Error ensuring canvas exists:', error);
    throw error;
  }
}
