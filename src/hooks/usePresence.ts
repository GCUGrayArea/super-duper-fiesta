import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { User } from '../store/authSlice';
import { 
  setCurrentCanvas,
  setPresenceConnection,
  updateOnlineUsers,
  clearPresence,
  setPresenceError,
  updateCurrentUserActivity,
} from '../store/presenceSlice';
import {
  subscribeToPresence,
  initializeUserPresence,
  removeUserPresence,
  updateUserActivity,
  UserPresence
} from '../firebase/db';
import { calculateUserColor } from '../utils/colorHash';

/**
 * Phase 5: Presence Hook
 * 
 * Manages real-time user presence tracking using Firebase Realtime Database.
 * Handles 15-minute activity window and user online/offline status.
 */

interface UsePresenceProps {
  canvasId: string; // Canvas ID to track presence for
  user: User | null; // Current authenticated user
  enabled: boolean; // Whether presence tracking is enabled
}

interface UsePresenceReturn {
  initializePresence: () => Promise<void>;
  updateActivity: () => Promise<void>;
  cleanup: () => Promise<void>;
}

export function usePresence({
  canvasId,
  user,
  enabled = true
}: UsePresenceProps): UsePresenceReturn {
  const dispatch = useDispatch();
  
  // Track subscription for cleanup
  const subscriptionRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  /**
   * Initialize user presence and start listening to presence updates
   */
  const initializePresence = useCallback(async () => {
    if (!enabled || !user || !canvasId) return;

    try {
      dispatch(setPresenceConnection(false));
      dispatch(setCurrentCanvas(canvasId));
      
      // Calculate user color
      const userColor = calculateUserColor(user.email);
      
      // Initialize user presence in Firebase (sets up disconnect cleanup)
      await initializeUserPresence(canvasId, user, userColor);
      
      // Set up real-time subscription to presence updates
      subscriptionRef.current = subscribeToPresence(
        canvasId,
        (users: { [uid: string]: UserPresence }) => {
          // Update Redux state with filtered users (15-minute window applied in Redux slice)
          dispatch(updateOnlineUsers(users));
          dispatch(setPresenceConnection(true));
        }
      );
      
      isInitializedRef.current = true;
      
    } catch (error) {
      console.error('Failed to initialize presence:', error);
      dispatch(setPresenceError(error instanceof Error ? error.message : 'Presence initialization failed'));
      dispatch(setPresenceConnection(false));
    }
  }, [canvasId, user, enabled, dispatch]);

  /**
   * Update current user's activity timestamp (called on edit actions)
   */
  const updateActivity = useCallback(async () => {
    if (!enabled || !user || !canvasId || !isInitializedRef.current) return;

    try {
      // Update activity timestamp in Firebase
      await updateUserActivity(canvasId, user.uid);
      
      // Update Redux state to reflect current user activity
      dispatch(updateCurrentUserActivity(user.uid));
      
    } catch (error) {
      console.error('Failed to update user activity:', error);
    }
  }, [canvasId, user, enabled, dispatch]);

  /**
   * Clean up presence subscription and remove user from presence
   */
  const cleanup = useCallback(async () => {
    try {
      // Unsubscribe from real-time updates
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      
      // Remove user from presence if they were logged in
      if (user && canvasId) {
        await removeUserPresence(canvasId, user.uid);
      }
      
      // Clear Redux state
      dispatch(clearPresence());
      dispatch(setPresenceConnection(false));
      
      isInitializedRef.current = false;
      
    } catch (error) {
      console.error('Failed to cleanup presence:', error);
    }
  }, [canvasId, user, dispatch]);

  // Initialize presence when user and canvas are available
  useEffect(() => {
    if (enabled && user && canvasId) {
      initializePresence();
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [initializePresence, enabled, user, canvasId]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    initializePresence,
    updateActivity,
    cleanup,
  };
}

