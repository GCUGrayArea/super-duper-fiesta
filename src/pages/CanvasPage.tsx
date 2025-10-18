import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/authSlice';
import { selectViewport } from '../store/canvasSlice';
// import { selectOnlineUsersList, selectOnlineUsersCount, selectPresenceConnection } from '../store/presenceSlice';
import { Canvas, NotificationOverlay, useNotifications, ChatWindow, CommandQueue } from '../components';
import { usePresence, useCursorTracking } from '../hooks';
// import { getComplementaryColor } from '../utils/colorUtils';
import { CANVAS_CONFIG } from '../types/canvas';
import { startQueueProcessor } from '../ai/queueProcessor';

/**
 * Main canvas application page (protected route)
 * Features collaborative canvas with real-time sync
 */
export const CanvasPage: React.FC = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const user = useAppSelector(selectUser);
  // const selectedObject = useAppSelector(selectSelectedObject);
  const viewport = useAppSelector(selectViewport);
  // const onlineUsers = useAppSelector(selectOnlineUsersList);
  // const onlineUsersCount = useAppSelector(selectOnlineUsersCount);
  // const isPresenceConnected = useAppSelector(selectPresenceConnection);
  const { notifications, addNotification, dismissNotification } = useNotifications();

  // Use display name if available, otherwise use email address
  const displayName = user?.displayName || user?.email || 'Unknown User';

  // Phase 5: Initialize presence and cursor tracking
  const { updateActivity } = usePresence({
    canvasId: 'main', // Use main canvas for MVP
    user,
    enabled: !!user
  });

  const { handleMouseMove, handleMouseLeave } = useCursorTracking({
    canvasId: 'main',
    user,
    viewport,
    canvasWidth: CANVAS_CONFIG.VIEWPORT_WIDTH,
    canvasHeight: CANVAS_CONFIG.VIEWPORT_HEIGHT,
    enabled: !!user
  });

  // Start a lightweight queue processor on mount (client lock via onSnapshot)
  React.useEffect(() => {
    startQueueProcessor('main');
  }, []);


  // Handle add rectangle button
  const handleAddRectangle = useCallback(async () => {
    try {
      if ((window as any).canvasAddRectangle) {
        (window as any).canvasAddRectangle();
        // Update user activity on edit action
        await updateActivity();
      }
    } catch (error) {
      console.error('Error adding rectangle:', error);
    }
  }, [updateActivity]);

  const handleAddCircle = useCallback(async () => {
    try {
      if ((window as any).canvasAddCircle) {
        (window as any).canvasAddCircle();
        await updateActivity();
      }
    } catch (error) {
      console.error('Error adding circle:', error);
    }
  }, [updateActivity]);

  const handleAddText = useCallback(async () => {
    try {
      if ((window as any).canvasAddText) {
        (window as any).canvasAddText();
        await updateActivity();
      }
    } catch (error) {
      console.error('Error adding text:', error);
    }
  }, [updateActivity]);

  const handleDeleteSelected = useCallback(async () => {
    try {
      if ((window as any).canvasDeleteSelected) {
        (window as any).canvasDeleteSelected();
        await updateActivity();
      }
    } catch (error) {
      console.error('Error deleting object:', error);
    }
  }, [updateActivity]);

  // Arrangement handlers
  const callAndActivity = useCallback(async (fnName: string) => {
    try {
      const fn = (window as any)[fnName];
      if (typeof fn === 'function') {
        await fn();
        await updateActivity();
      }
    } catch (error) {
      console.error(`Error calling ${fnName}:`, error);
    }
  }, [updateActivity]);


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header with user info - Always horizontal */}
      <header className="bg-white shadow-sm border-b border-gray-200 shrink-0">
        <div className="w-full px-3 sm:px-4">
          <div className="flex justify-between items-center h-12 sm:h-14">
            <div className="flex items-center min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                Collab Canvas
              </h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <span className="text-xs sm:text-sm text-gray-700 hidden sm:inline truncate">
                Welcome, {displayName}
              </span>
              <span className="text-xs text-gray-600 inline sm:hidden truncate">
                {displayName}
              </span>
              <div 
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-medium text-xs sm:text-sm shrink-0"
                style={{ backgroundColor: user?.color || '#6b7280' }}
                title={displayName}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              {/* Arrangement Controls moved to floating toolbar (on canvas) */}
              <Link 
                to="/logout"
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 shrink-0"
              >
                Sign out
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main canvas area */}
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Top toolbar outside canvas */}
          <div className="mb-3 flex items-center justify-center">
            <div className="flex items-center space-x-3 bg-white border border-gray-200 rounded-md shadow px-3 py-1 whitespace-nowrap">
              <div className="relative">
                <button
                  onClick={() => setCreateOpen(v => !v)}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  title="Create"
                >
                  Create
                </button>
                {createOpen && (
                  <div className="absolute mt-1 left-0 bg-white border border-gray-200 rounded shadow text-xs min-w-[120px]">
                    <button onClick={async () => { setCreateOpen(false); await handleAddRectangle(); }} className="block w-full text-left px-3 py-1 hover:bg-gray-100">Rectangle</button>
                    <button onClick={async () => { setCreateOpen(false); await handleAddCircle(); }} className="block w-full text-left px-3 py-1 hover:bg-gray-100">Circle</button>
                    <button onClick={async () => { setCreateOpen(false); await handleAddText(); }} className="block w-full text-left px-3 py-1 hover:bg-gray-100">Text</button>
                  </div>
                )}
              </div>
              <div className="w-px h-5 bg-gray-200" />
              <button
                onClick={handleDeleteSelected}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                title="Delete Selected"
              >
                Delete
              </button>
            </div>
          </div>
          
          {/* Canvas + right vertical arrangement toolbar + chat/queue */}
          <div className="grid grid-cols-1 lg:grid-cols-[auto_220px_320px] gap-3 items-start">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">
              <Canvas 
                width={CANVAS_CONFIG.VIEWPORT_WIDTH}
                height={CANVAS_CONFIG.VIEWPORT_HEIGHT}
                onNotification={addNotification}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onUserActivity={updateActivity}
              />
            </div>
            <div className="shrink-0">
              <div className="flex flex-col space-y-2 bg-white border border-gray-200 rounded-md shadow p-2">
                <button onClick={() => callAndActivity('canvasArrangeHorizontal')} className="px-2 py-1 text-[11px] bg-gray-100 border rounded hover:bg-gray-200" title="Arrange Horizontal">Horiz</button>
                <button onClick={() => callAndActivity('canvasArrangeVertical')} className="px-2 py-1 text-[11px] bg-gray-100 border rounded hover:bg-gray-200" title="Arrange Vertical">Vert</button>
                <button onClick={() => callAndActivity('canvasArrangeGrid')} className="px-2 py-1 text-[11px] bg-gray-100 border rounded hover:bg-gray-200" title="Arrange Grid">Grid</button>
                <button onClick={() => callAndActivity('canvasDistributeHorizontal')} className="px-2 py-1 text-[11px] bg-gray-100 border rounded hover:bg-gray-200" title="Distribute Horizontally">Dist H</button>
                <button onClick={() => callAndActivity('canvasDistributeVertical')} className="px-2 py-1 text-[11px] bg-gray-100 border rounded hover:bg-gray-200" title="Distribute Vertically">Dist V</button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="h-[360px]">
                <ChatWindow canvasId="main" userId={user?.uid || 'anonymous'} displayName={displayName} />
              </div>
              <CommandQueue canvasId="main" />
            </div>
          </div>
          
          {/* Instructions */}
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>
              Click "Add Rectangle" to create shapes • Drag to pan • Scroll to zoom • Click shapes to select • Shift-click to multi-select • Alt-drag to marquee select
            </p>
            <p className="mt-1">
              Commands apply to visible objects by default — add <span className="font-medium">"anywhere"</span> to include off‑screen items.
            </p>
            {/* TEMP: Example chat commands for testing (remove if noisy) */}
            <div className="mt-2 text-xs text-gray-500">
              <div className="font-medium">Examples (for testing):</div>
              <div>• Create rectangle x 100, y 200, width 150, height 100 red</div>
              <div>• Create circle x 400, y 300, radius 60 blue</div>
              <div>• Create text "Hello World" x 500, y 350</div>
              <div>• Arrange horizontal red rectangles</div>
              <div>• Arrange vertical text</div>
              <div>• Arrange grid blue circles</div>
              <div>• Distribute horizontal rectangles</div>
              <div>• Delete red rectangles</div>
              <div>• Rotate red rectangles 45 degrees</div>
              <div>• Resize blue circle radius 120</div>
              <div>• Resize text width 200 height 60</div>
              <div>• Undo the last 3</div>
            </div>
            {/* END TEMP */}
          </div>
        </div>
      </main>
      
      {/* Notification Overlay */}
      <NotificationOverlay
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  );
};
