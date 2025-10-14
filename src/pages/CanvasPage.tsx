import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectUser } from '../store/authSlice';
import { selectSelectedObject, deleteObject } from '../store/canvasSlice';
import { Canvas, NotificationOverlay, useNotifications } from '../components';
import { CANVAS_CONFIG } from '../types/canvas';

/**
 * Main canvas application page (protected route)
 * Features collaborative canvas with real-time sync
 */
export const CanvasPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const selectedObject = useAppSelector(selectSelectedObject);
  const { notifications, addNotification, dismissNotification } = useNotifications();

  // Use display name if available, otherwise use email address
  const displayName = user?.displayName || user?.email || 'Unknown User';

  // Handle add rectangle button
  const handleAddRectangle = useCallback(() => {
    try {
      if ((window as any).canvasAddRectangle) {
        (window as any).canvasAddRectangle();
      }
    } catch (error) {
      console.error('Error adding rectangle:', error);
    }
  }, []);

  // Handle delete button
  const handleDelete = useCallback(() => {
    if (selectedObject) {
      dispatch(deleteObject(selectedObject.id));
    }
  }, [selectedObject, dispatch]);

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
              <span className="text-xs text-gray-600 sm:hidden truncate">
                {displayName}
              </span>
              <div 
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-medium text-xs sm:text-sm shrink-0"
                style={{ backgroundColor: user?.color || '#6b7280' }}
                title={displayName}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
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
          {/* Canvas Toolbar */}
          <div className="mb-3 bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Canvas Controls */}
                <button
                  onClick={handleAddRectangle}
                  className="flex items-center space-x-1 px-2 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  title="Add Rectangle (Shift+R)"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Rectangle</span>
                </button>
                
                <button
                  onClick={handleDelete}
                  disabled={!selectedObject}
                  className={`flex items-center space-x-1 px-2 py-1 text-sm rounded-md transition-colors ${
                    selectedObject
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  title="Delete Selected (Delete key)"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Connected</span>
                </div>
                
                {selectedObject && (
                  <div className="text-blue-600">
                    Selected: Rectangle
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Canvas Container */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-4">
            <Canvas 
              width={CANVAS_CONFIG.VIEWPORT_WIDTH}
              height={CANVAS_CONFIG.VIEWPORT_HEIGHT}
              onNotification={addNotification}
            />
          </div>
          
          {/* Instructions */}
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>Click "Add Rectangle" to create shapes • Drag to pan • Scroll to zoom • Click shapes to select • Delete key to remove</p>
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
