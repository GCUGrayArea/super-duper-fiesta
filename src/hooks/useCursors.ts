import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../context/AuthContext';
import { RootState } from '../store';
import { updateCursors, setCurrentUserId, CursorPosition } from '../store/canvasSlice';
import { subscribeToGlobalCursors, updateCursorPositionThrottled, initializeUserPresence } from '../firebase/db';

interface UseCursorsProps {
  fabricCanvas?: any; // Removed canvasId as we now use a single global canvas
}

export const useCursors = ({ fabricCanvas }: UseCursorsProps) => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { cursors } = useSelector((state: RootState) => state.canvas);

  // Initialize user presence and subscribe to cursor updates
  useEffect(() => {
    if (!user) return;

    // Set current user ID in state
    dispatch(setCurrentUserId(user.uid));

    // Initialize user presence with a random color
    const userColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
    const displayName = user.displayName || user.email || `User ${user.uid.slice(0, 6)}`;
    
    initializeUserPresence(user.uid, displayName, userColor);

    // Subscribe to all cursor updates
    const unsubscribe = subscribeToGlobalCursors((cursorData: { [userId: string]: CursorPosition }) => {
      dispatch(updateCursors(cursorData));
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, dispatch]);

  // Track mouse movement on canvas and broadcast cursor position
  const updateCursorPosition = useCallback((x: number, y: number) => {
    if (!user) return;

    // Throttled update to avoid spam (60fps max)
    updateCursorPositionThrottled(user.uid, x, y, 16);
  }, [user]);

  // Set up mouse tracking on Fabric canvas
  useEffect(() => {
    if (!fabricCanvas || !user) return;

    const handleMouseMove = (event: any) => {
      const pointer = fabricCanvas.getPointer(event.e);
      updateCursorPosition(pointer.x, pointer.y);
    };

    const handleMouseLeave = () => {
      // Remove cursor when mouse leaves canvas
      if (user) {
        updateCursorPositionThrottled(user.uid, -1, -1, 0);
      }
    };

    // Add event listeners
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:out', handleMouseLeave);

    return () => {
      // Clean up event listeners
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:out', handleMouseLeave);
    };
  }, [fabricCanvas, user, updateCursorPosition]);

  return {
    cursors,
    updateCursorPosition,
  };
};

export default useCursors;
