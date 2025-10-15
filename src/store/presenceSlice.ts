import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// User presence interface for Phase 5 multiplayer
export interface UserPresence {
  uid: string;
  displayName: string;
  email: string;
  color: string; // Computed from email hash
  cursor?: {
    x: number; // World coordinates
    y: number; // World coordinates
  };
  lastSeen: number; // Timestamp
  lastActivity: number; // Last login or edit action timestamp
}

// Simple cursor interface for other users
export interface OtherUserCursor {
  uid: string;
  displayName: string;
  color: string;
  x: number;
  y: number;
  lastSeen: number;
}

// Presence state interface
export interface PresenceState {
  currentCanvasId: string | null; // Currently active canvas
  onlineUsers: { [uid: string]: UserPresence }; // Online users by UID
  otherUsersCursors: { [uid: string]: OtherUserCursor }; // Simple cursor tracking for other users
  isConnected: boolean; // Realtime Database connection status
  error: string | null; // Error state
  lastUpdate: number | null; // Last presence update timestamp
}

// Initial state
const initialState: PresenceState = {
  currentCanvasId: null,
  onlineUsers: {},
  otherUsersCursors: {},
  isConnected: false,
  error: null,
  lastUpdate: null,
};

// Presence slice
const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    // Set current canvas for presence tracking
    setCurrentCanvas: (state, action: PayloadAction<string>) => {
      state.currentCanvasId = action.payload;
      // Clear previous canvas users when switching
      state.onlineUsers = {};
    },

    // Set connection status to Realtime Database
    setPresenceConnection: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      if (!action.payload) {
        // Clear all users when disconnected
        state.onlineUsers = {};
      }
    },

    // Update all online users from Realtime Database
    updateOnlineUsers: (state, action: PayloadAction<{ [uid: string]: UserPresence }>) => {
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
      
      // Filter users who have been active in the last 15 minutes
      const activeUsers: { [uid: string]: UserPresence } = {};
      
      Object.entries(action.payload).forEach(([uid, user]) => {
        if (user && user.lastActivity && (now - user.lastActivity) <= fifteenMinutes) {
          // Preserve existing cursor data if user already exists (from cursor-only entry)
          const existingCursor = state.onlineUsers[uid]?.cursor;
          activeUsers[uid] = {
            ...user,
            cursor: existingCursor || user.cursor // Preserve cursor or use new cursor from presence
          };
        }
      });
      
      state.onlineUsers = activeUsers;
      state.lastUpdate = now;
      state.error = null;
    },

    // Update single user presence
    updateUserPresence: (state, action: PayloadAction<UserPresence>) => {
      const user = action.payload;
      // Preserve existing cursor data if user already exists (from cursor-only entry)
      const existingCursor = state.onlineUsers[user.uid]?.cursor;
      state.onlineUsers[user.uid] = {
        ...user,
        cursor: existingCursor // Preserve cursor position during presence update
      };
      state.lastUpdate = Date.now();
    },

    // Update user cursor position (separate from presence for simplicity)
    updateUserCursor: (state, action: PayloadAction<{ uid: string; x: number; y: number; displayName?: string; color?: string }>) => {
      const { uid, x, y, displayName, color } = action.payload;
      
      // Hide cursor if coordinates are negative (mouse leave)
      if (x < 0 || y < 0) {
        delete state.otherUsersCursors[uid];
        return;
      }
      
      // Create or update cursor in simple cursor state
      state.otherUsersCursors[uid] = {
        uid,
        displayName: displayName || state.otherUsersCursors[uid]?.displayName || `User ${uid.slice(0, 6)}`,
        color: color || state.otherUsersCursors[uid]?.color || '#6b7280',
        x,
        y,
        lastSeen: Date.now(),
      };
      
      
      // Also update presence cursor if user exists there
      if (state.onlineUsers[uid]) {
        state.onlineUsers[uid].cursor = { x, y };
        state.onlineUsers[uid].lastSeen = Date.now();
        state.onlineUsers[uid].lastActivity = Date.now();
      }
    },

    // Remove user from presence (disconnect/logout)
    removeUserPresence: (state, action: PayloadAction<string>) => {
      const uid = action.payload;
      delete state.onlineUsers[uid];
      state.lastUpdate = Date.now();
    },

    // Update current user's activity timestamp
    updateCurrentUserActivity: (state, action: PayloadAction<string>) => {
      const uid = action.payload;
      if (state.onlineUsers[uid]) {
        state.onlineUsers[uid].lastActivity = Date.now();
        state.onlineUsers[uid].lastSeen = Date.now();
      }
    },

    // Set presence error
    setPresenceError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    // Clear presence error
    clearPresenceError: (state) => {
      state.error = null;
    },

    // Clear all presence data (for cleanup)
    clearPresence: (state) => {
      state.currentCanvasId = null;
      state.onlineUsers = {};
      state.otherUsersCursors = {};
      state.isConnected = false;
      state.error = null;
      state.lastUpdate = null;
    },
  },
});

// Export actions
export const {
  setCurrentCanvas,
  setPresenceConnection,
  updateOnlineUsers,
  updateUserPresence,
  updateUserCursor,
  removeUserPresence,
  updateCurrentUserActivity,
  setPresenceError,
  clearPresenceError,
  clearPresence,
} = presenceSlice.actions;

// Selectors for easy access to presence state
export const selectPresence = (state: { presence: PresenceState }) => state.presence;
export const selectOnlineUsers = (state: { presence: PresenceState }) => state.presence.onlineUsers;
export const selectOnlineUsersList = (state: { presence: PresenceState }) => Object.values(state.presence.onlineUsers);
export const selectOnlineUsersCount = (state: { presence: PresenceState }) => Object.keys(state.presence.onlineUsers).length;
export const selectPresenceConnection = (state: { presence: PresenceState }) => state.presence.isConnected;
export const selectPresenceError = (state: { presence: PresenceState }) => state.presence.error;
export const selectCurrentCanvas = (state: { presence: PresenceState }) => state.presence.currentCanvasId;

// Selector to get users with visible cursors (simple cursor-only approach)
export const selectUsersWithCursors = (state: { presence: PresenceState }) => {
  const cursors = Object.values(state.presence.otherUsersCursors);
  return cursors;
};

// Selector to get presence-based users with cursors (for compatibility)
export const selectPresenceUsersWithCursors = (state: { presence: PresenceState }) => 
  Object.values(state.presence.onlineUsers).filter(user => user.cursor);

// Selector to get other users (excluding current user)
export const selectOtherUsers = (currentUserId: string) => (state: { presence: PresenceState }) =>
  Object.values(state.presence.onlineUsers).filter(user => user.uid !== currentUserId);

// Export reducer as default
export default presenceSlice.reducer;
