import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '../store/hooks';
import { User } from '../store/authSlice';
import { Viewport } from '../types/canvas';
import { 
  updateUserCursor,
  selectOnlineUsers,
} from '../store/presenceSlice';
import {
  updateCursorPosition,
  subscribeToCursors,
  CursorPosition
} from '../firebase/db';
import { calculateUserColor } from '../utils/colorHash';

/**
 * Phase 5: Cursor Tracking Hook
 * 
 * Manages live cursor position tracking with 5px threshold and throttling.
 * Converts canvas coordinates to world coordinates and syncs via Firebase Realtime Database.
 */

interface UseCursorTrackingProps {
  canvasId: string; // Canvas ID for cursor tracking
  user: User | null; // Current authenticated user
  viewport: Viewport; // Current viewport for coordinate conversion
  canvasWidth: number; // Canvas element width
  canvasHeight: number; // Canvas element height
  enabled: boolean; // Whether cursor tracking is enabled
}

interface UseCursorTrackingReturn {
  handleMouseMove: (event: MouseEvent) => void;
  handleMouseLeave: () => void;
  startCursorTracking: () => void;
  stopCursorTracking: () => void;
}


export function useCursorTracking({
  canvasId,
  user,
  viewport,
  canvasWidth,
  canvasHeight,
  enabled = true
}: UseCursorTrackingProps): UseCursorTrackingReturn {
  const dispatch = useDispatch();
  const onlineUsers = useAppSelector(selectOnlineUsers);
  
  // Track last cursor position and update timing
  const lastCursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const subscriptionRef = useRef<(() => void) | null>(null);

  /**
   * Convert canvas mouse coordinates to world coordinates
   */
  const canvasToWorldCoordinates = useCallback((
    canvasX: number, 
    canvasY: number
  ): { x: number; y: number } => {
    const { x: viewportX, y: viewportY, zoom } = viewport;
    
    // Convert canvas screen coordinates to world coordinates
    // Canvas coordinates are relative to canvas element (0,0 at top-left)
    // World coordinates need to account for current viewport position and zoom
    const worldX = viewportX + (canvasX - canvasWidth / 2) / zoom;
    const worldY = viewportY + (canvasY - canvasHeight / 2) / zoom;
    
    return { x: worldX, y: worldY };
  }, [viewport, canvasWidth, canvasHeight]);

  /**
   * Check if cursor position has actually changed (prevent redundant updates)
   */
  const hasPositionChanged = useCallback((
    newX: number, 
    newY: number
  ): boolean => {
    if (!lastCursorPosRef.current) return true;
    
    // Only check for exact position changes to avoid redundant Firebase writes
    return lastCursorPosRef.current.x !== newX || lastCursorPosRef.current.y !== newY;
  }, []);


  /**
   * Handle mouse move events on canvas
   */
  const handleMouseMove = useCallback(async (event: MouseEvent) => {
    if (!enabled || !user || !canvasId) return;

    // Get cursor position relative to canvas
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    // Convert to world coordinates
    const { x: worldX, y: worldY } = canvasToWorldCoordinates(canvasX, canvasY);
    
    // Only update if position actually changed (prevent redundant Firebase writes)
    if (!hasPositionChanged(worldX, worldY)) {
      return;
    }
    
    try {
      // Firebase-first: Update Firebase only - real-time listener will update Redux for ALL users
      await updateCursorPosition(canvasId, user.uid, worldX, worldY);
      
      // Update tracking refs
      lastCursorPosRef.current = { x: worldX, y: worldY };
      lastUpdateTimeRef.current = Date.now();
    } catch (error) {
      console.error('Failed to update cursor position:', error);
    }
  }, [
    enabled, 
    user, 
    canvasId, 
    canvasToWorldCoordinates, 
    hasPositionChanged, 
    dispatch
  ]);

  /**
   * Handle mouse leave events (hide cursor)
   */
  const handleMouseLeave = useCallback(async () => {
    if (!enabled || !user || !canvasId) return;

    try {
      // Remove cursor from Firebase (set to null)
      await updateCursorPosition(canvasId, user.uid, -1, -1); // Use -1,-1 to indicate hidden
      
      // Clear cursor in Redux state
      dispatch(updateUserCursor({
        uid: user.uid,
        x: -1,
        y: -1,
      }));
      
      // Reset tracking refs
      lastCursorPosRef.current = null;
      
    } catch (error) {
      console.error('Failed to hide cursor:', error);
    }
  }, [enabled, user, canvasId, dispatch]);

  /**
   * Start cursor tracking subscription
   */
  const startCursorTracking = useCallback(() => {
    if (!enabled || !canvasId) return;

    // Subscribe to other users' cursor positions
    subscriptionRef.current = subscribeToCursors(
      canvasId,
      (cursors: { [uid: string]: CursorPosition }) => {
        
        // Update Redux state with OTHER users' cursors only (not current user)
        Object.entries(cursors).forEach(([uid, cursor]) => {
          // Skip current user - they can see their real mouse cursor
          if (user && uid === user.uid) {
            return;
          }
          
          if (cursor.x >= 0 && cursor.y >= 0) {
            // Get real user data from presence state
            const userData = onlineUsers[uid];
            const displayName = userData?.displayName || `User ${uid.slice(0, 6)}`;
            const color = userData?.color || calculateUserColor(userData?.email || `${uid}@example.com`);
            
            dispatch(updateUserCursor({
              uid,
              x: cursor.x,
              y: cursor.y,
              displayName,
              color
            }));
          } else {
            // Handle cursor hide/removal for other users
            dispatch(updateUserCursor({
              uid,
              x: -1,
              y: -1,
            }));
          }
        });
      }
    );
  }, [enabled, canvasId, user, dispatch, onlineUsers]);

  /**
   * Stop cursor tracking subscription
   */
  const stopCursorTracking = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
    
    // Reset tracking refs
    lastCursorPosRef.current = null;
    lastUpdateTimeRef.current = 0;
  }, []);

  // Start/stop cursor tracking based on enabled state and dependencies
  useEffect(() => {
    if (enabled && canvasId) {
      startCursorTracking();
    } else {
      stopCursorTracking();
    }
    
    return stopCursorTracking;
  }, [enabled, canvasId, startCursorTracking, stopCursorTracking]);

  return {
    handleMouseMove,
    handleMouseLeave,
    startCursorTracking,
    stopCursorTracking,
  };
}
