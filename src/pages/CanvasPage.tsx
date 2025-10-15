import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/authSlice';
import { selectSelectedObject, selectViewport } from '../store/canvasSlice';
import { selectOnlineUsersList, selectOnlineUsersCount, selectPresenceConnection } from '../store/presenceSlice';
import { Canvas, NotificationOverlay, useNotifications } from '../components';
import { usePresence, useCursorTracking } from '../hooks';
import { getComplementaryColor } from '../utils/colorUtils';
import { CANVAS_CONFIG } from '../types/canvas';

/**
 * Main canvas application page (protected route)
 * Features collaborative canvas with real-time sync
 */
export const CanvasPage: React.FC = () => {
  const user = useAppSelector(selectUser);
  const selectedObject = useAppSelector(selectSelectedObject);
  const viewport = useAppSelector(selectViewport);
  const onlineUsers = useAppSelector(selectOnlineUsersList);
  const onlineUsersCount = useAppSelector(selectOnlineUsersCount);
  const isPresenceConnected = useAppSelector(selectPresenceConnection);
  const { notifications, addNotification, dismissNotification } = useNotifications();

  // Use display name if available, otherwise use email address
  // Fix potential duplication in display name (e.g., "FirstFirst" -> "First", "g@gg@g" -> "g@g")  
  const rawDisplayName = user?.displayName || user?.email || 'Unknown User';
  
  const displayName = (() => {
    // For email addresses, check for character-level duplication around the @ symbol
    if (rawDisplayName.includes('@')) {
      const allParts = rawDisplayName.split('@');
      if (allParts.length > 2) {
        // Handle cases like "g@gg@g" -> ["g", "gg", "g"]
        const cleanedParts = [];
        cleanedParts.push(allParts[0]); // Keep first part
        
        // For middle parts that might be duplicates, clean them
        for (let i = 1; i < allParts.length - 1; i++) {
          const part = allParts[i];
          const cleanPart = part.replace(/(.)\1+/g, '$1');
          if (cleanPart && cleanPart !== cleanedParts[cleanedParts.length - 1]) {
            cleanedParts.push(cleanPart);
          }
        }
        
        // Add last part (domain)
        if (allParts[allParts.length - 1]) {
          cleanedParts.push(allParts[allParts.length - 1]);
        }
        
        return cleanedParts.join('@');
      } else if (allParts.length === 2) {
        // Standard email cleaning
        const [localPart, domain] = allParts;
        const cleanLocal = localPart.replace(/(.)\1+/g, '$1');
        const cleanDomain = domain.replace(/(.)\1+/g, '$1');
        return `${cleanLocal}@${cleanDomain}`;
      }
      return rawDisplayName;
    }
    
    // For non-email display names, check for word-level duplication
    const words = rawDisplayName.split(' ');
    const cleanWords = [];
    for (let i = 0; i < words.length; i++) {
      // Only add word if it's not the same as the previous word
      if (i === 0 || words[i] !== words[i-1]) {
        cleanWords.push(words[i]);
      }
    }
    return cleanWords.join(' ');
  })();

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
            
            <div className="flex items-center space-x-2 ml-auto">
              <span className="text-xs sm:text-sm text-gray-700 truncate">
                <span className="hidden sm:inline">Welcome, </span>{displayName}
              </span>
              <div 
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0"
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
      <main className="flex-1 flex">
        {/* Left sidebar - Presence List */}
        <div className="w-48 max-w-48 bg-white shadow-sm border-r border-gray-200 p-3 flex-shrink-0">
          <div className="space-y-3">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Online Users</h3>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-3 h-3 rounded-full ${isPresenceConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-medium text-gray-600">
                  {onlineUsersCount} user{onlineUsersCount !== 1 ? 's' : ''} online
                </span>
              </div>
            </div>
            
            {onlineUsersCount > 0 && (
              <div className="space-y-2">
                {onlineUsers.map((onlineUser) => {
                  // Clean up display name for each user to remove duplicates
                  const cleanUserName = (() => {
                    const rawName = onlineUser.displayName;
                    
                    // For email addresses, check for character-level duplication around the @ symbol
                    if (rawName.includes('@')) {
                      const allParts = rawName.split('@');
                      if (allParts.length > 2) {
                        // Handle cases like "g@gg@g" -> ["g", "gg", "g"]
                        const cleanedParts = [];
                        cleanedParts.push(allParts[0]); // Keep first part
                        
                        // For middle parts that might be duplicates, clean them
                        for (let i = 1; i < allParts.length - 1; i++) {
                          const part = allParts[i];
                          const cleanPart = part.replace(/(.)\1+/g, '$1');
                          if (cleanPart && cleanPart !== cleanedParts[cleanedParts.length - 1]) {
                            cleanedParts.push(cleanPart);
                          }
                        }
                        
                        // Add last part (domain)
                        if (allParts[allParts.length - 1]) {
                          cleanedParts.push(allParts[allParts.length - 1]);
                        }
                        
                        return cleanedParts.join('@');
                      } else if (allParts.length === 2) {
                        // Standard email cleaning
                        const [localPart, domain] = allParts;
                        const cleanLocal = localPart.replace(/(.)\1+/g, '$1');
                        const cleanDomain = domain.replace(/(.)\1+/g, '$1');
                        return `${cleanLocal}@${cleanDomain}`;
                      }
                      return rawName;
                    }
                    
                    // For non-email display names, check for word-level duplication
                    const words = rawName.split(' ');
                    const cleanWords = [];
                    for (let i = 0; i < words.length; i++) {
                      if (i === 0 || words[i] !== words[i-1]) {
                        cleanWords.push(words[i]);
                      }
                    }
                    return cleanWords.join(' ');
                  })();
                  
                  return (
                    <div
                      key={onlineUser.uid}
                      className="flex items-center space-x-2 p-2 rounded-lg text-xs font-medium border border-gray-200 shadow-sm max-w-full"
                      style={{ 
                        backgroundColor: onlineUser.color,
                        color: getComplementaryColor(onlineUser.color as any),
                        maxWidth: '80px'
                      }}
                      title={`${cleanUserName} ${onlineUser.uid === user?.uid ? '(you)' : ''}`}
                    >
                      <div className="w-3 h-3 rounded-full bg-white opacity-60 flex-shrink-0" />
                      <span className="truncate min-w-0">
                        {cleanUserName} {onlineUser.uid === user?.uid ? '(you)' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-4">
          <div className="h-full">
            {/* Canvas Toolbar */}
            <div className="mb-3 bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {/* Canvas Controls */}
                  <button
                    onClick={handleAddRectangle}
                    className="flex items-center space-x-1 px-2 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    title="Add Rectangle"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Rectangle</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                  {selectedObject && (
                    <div className="text-blue-600 font-medium">
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
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onUserActivity={updateActivity}
            />
          </div>
          
          {/* Instructions */}
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>Click "Add Rectangle" to create shapes • Drag to pan • Scroll to zoom • Click shapes to select</p>
          </div>
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
