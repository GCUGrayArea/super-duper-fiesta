import { useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { User } from '../store/authSlice';
import { 
  selectCanvasObjects, 
  selectConnectionStatus, 
  selectSyncState,
  setConnectionStatus,
  setSyncTime,
  updateSyncState,
  mergeRemoteObjects,
  replaceObjects,
  setCanvasError
} from '../store/canvasSlice';
import { CanvasObject } from '../types/canvas';
import {
  loadCanvas,
  subscribeToCanvas,
  updateCanvasObjects,
  addObjectToCanvas,
  updateObjectInCanvas,
  deleteObjectFromCanvas,
  ensureCanvasExists
} from '../firebase/canvasSync';
import {
  shouldSyncObjectChanges,
  updateSyncStateTracking,
  getLastSyncedState,
  SyncState
} from '../utils/syncHelpers';

/**
 * Phase 4: Canvas Sync Hook
 * 
 * Manages real-time synchronization between local canvas state and Firestore.
 * Handles echo prevention, threshold-based sync, and connection management.
 */

interface UseCanvasSyncProps {
  canvasId: string; // Canvas ID (e.g., "main" for MVP)
  user: User; // Current authenticated user
  enabled: boolean; // Whether sync is enabled
}

interface UseCanvasSyncReturn {
  isConnected: boolean;
  lastSyncTime: number | null;
  syncObject: (objectId: string, updates: Partial<CanvasObject>) => Promise<void>;
  addObject: (object: CanvasObject) => Promise<void>;
  deleteObject: (objectId: string) => Promise<void>;
  forceSync: () => Promise<void>;
  batchUpdateObjects: (updated: CanvasObject[]) => Promise<void>;
}

export function useCanvasSync({
  canvasId,
  user,
  enabled = true
}: UseCanvasSyncProps): UseCanvasSyncReturn {
  const dispatch = useDispatch();
  const objects = useSelector(selectCanvasObjects);
  const isConnected = useSelector(selectConnectionStatus);
  const syncState = useSelector(selectSyncState);
  
  // Track subscription and sync state
  const subscriptionRef = useRef<(() => void) | null>(null);
  const initialLoadRef = useRef<boolean>(false);
  const syncStateRef = useRef<SyncState>(syncState);
  
  // Update sync state ref when Redux state changes
  useEffect(() => {
    syncStateRef.current = syncState;
  }, [syncState]);

  /**
   * Initialize canvas and start real-time sync
   */
  const initializeCanvas = useCallback(async () => {
    if (!enabled || !user) return;

    try {
      dispatch(setConnectionStatus(false));
      
      // Ensure canvas exists in Firestore
      await ensureCanvasExists(canvasId, user.uid);
      
      // Load initial canvas state
      const canvas = await loadCanvas(canvasId);
      if (canvas && !initialLoadRef.current) {
        dispatch(replaceObjects(canvas.objects));
        
        // Initialize sync state tracking for all objects
        let newSyncState: SyncState = {};
        for (const obj of canvas.objects) {
          newSyncState = updateSyncStateTracking(newSyncState, obj);
        }
        dispatch(updateSyncState(newSyncState));
        
        initialLoadRef.current = true;
      }
      
      // Set up real-time subscription
      subscriptionRef.current = subscribeToCanvas(
        canvasId,
        (updatedCanvas) => {
          if (updatedCanvas && initialLoadRef.current) {
            // Merge remote changes with echo prevention
            dispatch(mergeRemoteObjects({
              objects: updatedCanvas.objects,
              currentUserId: user.uid
            }));
            
            // Update sync state for remote objects
            let newSyncState = { ...syncStateRef.current };
            for (const obj of updatedCanvas.objects) {
              // Only update sync state for objects NOT modified by current user (avoid echo)
              if (obj.lastModifiedBy !== user.uid) {
                newSyncState = updateSyncStateTracking(newSyncState, obj);
              }
            }
            dispatch(updateSyncState(newSyncState));
            dispatch(setSyncTime(Date.now()));
          }
        },
        (error) => {
          console.error('Canvas sync error:', error);
          dispatch(setCanvasError(error.message));
          dispatch(setConnectionStatus(false));
        }
      );
      
      dispatch(setConnectionStatus(true));
      dispatch(setSyncTime(Date.now()));
      
    } catch (error) {
      console.error('Failed to initialize canvas sync:', error);
      dispatch(setCanvasError(error instanceof Error ? error.message : 'Sync initialization failed'));
      dispatch(setConnectionStatus(false));
    }
  }, [canvasId, user, enabled, dispatch]);

  /**
   * Clean up subscription
   */
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
    dispatch(setConnectionStatus(false));
  }, [dispatch]);

  /**
   * Sync object updates with threshold checking
   */
  const syncObject = useCallback(async (objectId: string, updates: Partial<CanvasObject>) => {
    if (!enabled || !user || !isConnected) return;

    try {
      // Find current object
      const currentObject = objects.find(obj => obj.id === objectId);
      if (!currentObject) return;

      // Get last synced state
      const lastSynced = getLastSyncedState(syncStateRef.current, objectId);
      if (!lastSynced) return;

      // Create updated object
      const updatedObject = {
        ...currentObject,
        ...(updates as any),
        updatedAt: Date.now(),
        lastModifiedBy: user.uid
      } as CanvasObject;

      // Check if changes exceed sync thresholds
      const lastSyncedObject: CanvasObject = {
        ...currentObject,
        x: lastSynced.position.x,
        y: lastSynced.position.y,
        ...(currentObject.type === 'rectangle' && {
          width: lastSynced.size.width,
          height: lastSynced.size.height,
          rotation: lastSynced.rotation
        })
      } as CanvasObject;

      if (shouldSyncObjectChanges(lastSyncedObject, updatedObject)) {
        // Sync to Firestore
        await updateObjectInCanvas(canvasId, objectId, updates, user.uid, objects);
        
        // Update sync state tracking
        const newSyncState = updateSyncStateTracking(syncStateRef.current, updatedObject);
        dispatch(updateSyncState(newSyncState));
        dispatch(setSyncTime(Date.now()));
      }
    } catch (error) {
      console.error('Failed to sync object:', error);
      dispatch(setCanvasError(error instanceof Error ? error.message : 'Object sync failed'));
    }
  }, [canvasId, user, enabled, isConnected, objects, dispatch]);

  /**
   * Add new object to canvas
   */
  const addObject = useCallback(async (object: CanvasObject) => {
    if (!enabled || !user || !isConnected) return;

    try {
      await addObjectToCanvas(canvasId, object, objects);
      
      // Update sync state tracking
      const newSyncState = updateSyncStateTracking(syncStateRef.current, object);
      dispatch(updateSyncState(newSyncState));
      dispatch(setSyncTime(Date.now()));
    } catch (error) {
      console.error('Failed to add object:', error);
      dispatch(setCanvasError(error instanceof Error ? error.message : 'Add object failed'));
    }
  }, [canvasId, user, enabled, isConnected, objects, dispatch]);

  /**
   * Delete object from canvas
   */
  const deleteObject = useCallback(async (objectId: string) => {
    if (!enabled || !user || !isConnected) return;

    try {
      await deleteObjectFromCanvas(canvasId, objectId, user.uid, objects);
      
      // Remove from sync state tracking
      const newSyncState = { ...syncStateRef.current };
      delete newSyncState[objectId];
      dispatch(updateSyncState(newSyncState));
      dispatch(setSyncTime(Date.now()));
    } catch (error) {
      console.error('Failed to delete object:', error);
      dispatch(setCanvasError(error instanceof Error ? error.message : 'Delete object failed'));
    }
  }, [canvasId, user, enabled, isConnected, objects, dispatch]);

  /**
   * Force sync all objects to Firestore
   */
  const forceSync = useCallback(async () => {
    if (!enabled || !user || !isConnected || objects.length === 0) return;

    try {
      await updateCanvasObjects(canvasId, objects, user.uid);
      
      // Update sync state for all objects
      let newSyncState: SyncState = {};
      for (const obj of objects) {
        newSyncState = updateSyncStateTracking(newSyncState, obj);
      }
      dispatch(updateSyncState(newSyncState));
      dispatch(setSyncTime(Date.now()));
    } catch (error) {
      console.error('Failed to force sync:', error);
      dispatch(setCanvasError(error instanceof Error ? error.message : 'Force sync failed'));
    }
  }, [canvasId, user, enabled, isConnected, objects, dispatch]);

  /**
   * Batch update multiple objects with a single Firestore write
   */
  const batchUpdateObjects = useCallback(async (updated: CanvasObject[]) => {
    if (!enabled || !user || !isConnected) return;
    try {
      await updateCanvasObjects(canvasId, updated, user.uid);
      // Update sync state for updated objects
      let newSyncState: SyncState = { ...syncStateRef.current };
      for (const obj of updated) {
        newSyncState = updateSyncStateTracking(newSyncState, obj);
      }
      dispatch(updateSyncState(newSyncState));
      dispatch(setSyncTime(Date.now()));
    } catch (error) {
      console.error('Failed to batch update objects:', error);
      dispatch(setCanvasError(error instanceof Error ? error.message : 'Batch update failed'));
    }
  }, [canvasId, user, enabled, isConnected, dispatch]);

  // Initialize canvas sync on mount and user change
  useEffect(() => {
    if (enabled && user) {
      initializeCanvas();
    }
    
    return cleanup;
  }, [initializeCanvas, cleanup, enabled, user]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isConnected,
    lastSyncTime: useSelector((state: { canvas: { lastSyncTime: number | null } }) => state.canvas?.lastSyncTime || null),
    syncObject,
    addObject,
    deleteObject,
    forceSync,
    batchUpdateObjects,
  };
}
