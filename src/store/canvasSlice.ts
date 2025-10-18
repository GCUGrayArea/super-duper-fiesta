import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CanvasObject, Viewport, Selection, CANVAS_CONFIG } from '../types/canvas';
import { 
  createRectangle, 
  calculateNextZIndex, 
  sortObjectsByZIndex 
} from '../utils/canvasObjects';
import { SyncState } from '../utils/syncHelpers';

// Canvas state interface
export interface CanvasState {
  objects: CanvasObject[]; // All canvas objects
  viewport: Viewport; // Current viewport state
  selection: Selection; // Current selection state
  isLoading: boolean; // Loading state for operations
  error: string | null; // Error state
  // Phase 4 sync state
  isConnected: boolean; // Firestore connection status
  lastSyncTime: number | null; // Timestamp of last successful sync
  syncState: SyncState; // Track last synced states for threshold calculations
}

// Initial state
const initialState: CanvasState = {
  objects: [],
  viewport: {
    x: CANVAS_CONFIG.DEFAULT_VIEWPORT_X,
    y: CANVAS_CONFIG.DEFAULT_VIEWPORT_Y,
    zoom: 1.0,
  },
  selection: {
    selectedObjectId: null,
  },
  isLoading: false,
  error: null,
  // Phase 4 sync state
  isConnected: false,
  lastSyncTime: null,
  syncState: {},
};

// Canvas slice
const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // Add a new rectangle at specified position
    addRectangle: (state, action: PayloadAction<{ x: number; y: number; userId: string }>) => {
      const { x, y, userId } = action.payload;
      const newRectangle = createRectangle(x, y, userId, state.objects);
      state.objects.push(newRectangle);
      // Auto-select the new object
      state.selection.selectedObjectId = newRectangle.id;
    },

    // Update an existing object
    updateObject: (state, action: PayloadAction<{ id: string; updates: Partial<CanvasObject>; userId?: string }>) => {
      const { id, updates, userId } = action.payload;
      const objectIndex = state.objects.findIndex(obj => obj.id === id);
      
      if (objectIndex !== -1) {
        const merged = {
          ...state.objects[objectIndex],
          ...updates,
          updatedAt: Date.now(),
          ...(userId && { lastModifiedBy: userId }),
        } as CanvasObject;
        state.objects[objectIndex] = merged;
      }
    },

    // Delete an object
    deleteObject: (state, action: PayloadAction<string>) => {
      const objectId = action.payload;
      state.objects = state.objects.filter(obj => obj.id !== objectId);
      
      // Clear selection if deleted object was selected
      if (state.selection.selectedObjectId === objectId) {
        state.selection.selectedObjectId = null;
      }
    },

    // Bring object to front (set highest z-index)
    bringToFront: (state, action: PayloadAction<{ objectId: string; userId?: string }>) => {
      const { objectId, userId } = action.payload;
      const objectIndex = state.objects.findIndex(obj => obj.id === objectId);
      
      if (objectIndex !== -1) {
        const newZIndex = calculateNextZIndex(state.objects);
        state.objects[objectIndex] = {
          ...state.objects[objectIndex],
          zIndex: newZIndex,
          updatedAt: Date.now(),
          ...(userId && { lastModifiedBy: userId }),
        };
      }
    },

    // Select an object
    selectObject: (state, action: PayloadAction<string | null>) => {
      state.selection.selectedObjectId = action.payload;
    },

    // Update viewport position
    updateViewport: (state, action: PayloadAction<Partial<Viewport>>) => {
      state.viewport = {
        ...state.viewport,
        ...action.payload,
      };
    },

    // Pan viewport (with boundary constraints)
    panViewport: (state, action: PayloadAction<{ deltaX: number; deltaY: number }>) => {
      const { deltaX, deltaY } = action.payload;
      const { viewport } = state;
      
      // Calculate new position
      let newX = viewport.x + deltaX;
      let newY = viewport.y + deltaY;
      
      // Apply boundary constraints (can't pan outside 0-5000 world)
      // Account for zoom level in constraints
      const halfViewportWidth = (CANVAS_CONFIG.VIEWPORT_WIDTH / 2) / viewport.zoom;
      const halfViewportHeight = (CANVAS_CONFIG.VIEWPORT_HEIGHT / 2) / viewport.zoom;
      
      newX = Math.max(halfViewportWidth, Math.min(CANVAS_CONFIG.WORLD_WIDTH - halfViewportWidth, newX));
      newY = Math.max(halfViewportHeight, Math.min(CANVAS_CONFIG.WORLD_HEIGHT - halfViewportHeight, newY));
      
      state.viewport.x = newX;
      state.viewport.y = newY;
    },

    // Zoom viewport (with zoom limits)
    zoomViewport: (state, action: PayloadAction<{ delta: number; centerX?: number; centerY?: number }>) => {
      const { delta, centerX, centerY } = action.payload;
      const { viewport } = state;
      
      // Calculate new zoom level
      const zoomFactor = 1 + (delta * 0.1); // 10% zoom steps
      let newZoom = viewport.zoom * zoomFactor;
      
      // Apply zoom limits
      newZoom = Math.max(CANVAS_CONFIG.MIN_ZOOM, Math.min(CANVAS_CONFIG.MAX_ZOOM, newZoom));
      
      // If zoom actually changed
      if (newZoom !== viewport.zoom) {
        // Zoom towards specified center point (or current center)
        const zoomCenterX = centerX ?? viewport.x;
        const zoomCenterY = centerY ?? viewport.y;
        
        // Adjust viewport position to zoom towards the center point
        const zoomRatio = newZoom / viewport.zoom;
        const newX = zoomCenterX + (viewport.x - zoomCenterX) / zoomRatio;
        const newY = zoomCenterY + (viewport.y - zoomCenterY) / zoomRatio;
        
        state.viewport.zoom = newZoom;
        state.viewport.x = newX;
        state.viewport.y = newY;
      }
    },

    // Set loading state
    setCanvasLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error state
    setCanvasError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Clear all objects (for testing)
    clearCanvas: (state) => {
      state.objects = [];
      state.selection.selectedObjectId = null;
    },

    // Replace all objects (for sync/load)
    replaceObjects: (state, action: PayloadAction<CanvasObject[]>) => {
      state.objects = sortObjectsByZIndex(action.payload);
      // Clear selection if selected object no longer exists
      if (state.selection.selectedObjectId && 
          !state.objects.find(obj => obj.id === state.selection.selectedObjectId)) {
        state.selection.selectedObjectId = null;
      }
    },

    // Phase 4 sync actions
    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    setSyncTime: (state, action: PayloadAction<number>) => {
      state.lastSyncTime = action.payload;
    },

    updateSyncState: (state, action: PayloadAction<SyncState>) => {
      state.syncState = action.payload;
    },

    // Merge remote objects with local state (with smart echo prevention)
    mergeRemoteObjects: (state, action: PayloadAction<{ objects: CanvasObject[]; currentUserId: string }>) => {
      const { objects: remoteObjects } = action.payload;
      
      // Create a map of current objects for efficient lookup
      const currentObjectsMap = new Map(state.objects.map(obj => [obj.id, obj]));
      
      // Merge remote objects with local objects
      const mergedObjects: CanvasObject[] = [];
      
      // Process each remote object
      for (const remoteObj of remoteObjects) {
        const localObj = currentObjectsMap.get(remoteObj.id);
        
        if (!localObj) {
          // NEW OBJECT: Always add new objects regardless of who created them
          // This ensures creators see their own new objects via real-time listener
          mergedObjects.push(remoteObj);
        } else {
          // EXISTING OBJECT: Apply echo prevention for updates
          // Always prefer newest updatedAt to avoid disappearing objects due to race
          const preferRemote = (remoteObj.updatedAt ?? 0) >= (localObj.updatedAt ?? 0);
          mergedObjects.push(preferRemote ? remoteObj : localObj);
        }
        
        // Remove from local map (processed)
        currentObjectsMap.delete(remoteObj.id);
      }
      // Do NOT re-add remaining local objects that are not present in remote.
      // These were deleted remotely; remote is the source of truth.
      
      // Sort by z-index and update state
      state.objects = sortObjectsByZIndex(mergedObjects);
      
      // Clear selection if selected object no longer exists
      if (state.selection.selectedObjectId && 
          !state.objects.find(obj => obj.id === state.selection.selectedObjectId)) {
        state.selection.selectedObjectId = null;
      }
    },
  },
});

// Export actions
export const {
  addRectangle,
  updateObject,
  deleteObject,
  bringToFront,
  selectObject,
  updateViewport,
  panViewport,
  zoomViewport,
  setCanvasLoading,
  setCanvasError,
  clearCanvas,
  replaceObjects,
  // Phase 4 sync actions
  setConnectionStatus,
  setSyncTime,
  updateSyncState,
  mergeRemoteObjects,
} = canvasSlice.actions;

// Selectors for easy access to canvas state
export const selectCanvas = (state: { canvas: CanvasState }) => state.canvas;
export const selectCanvasObjects = (state: { canvas: CanvasState }) => state.canvas.objects;
export const selectViewport = (state: { canvas: CanvasState }) => state.canvas.viewport;
export const selectSelection = (state: { canvas: CanvasState }) => state.canvas.selection;
export const selectSelectedObject = (state: { canvas: CanvasState }) => {
  const { objects, selection } = state.canvas;
  return selection.selectedObjectId ? 
    objects.find(obj => obj.id === selection.selectedObjectId) || null : 
    null;
};
export const selectCanvasLoading = (state: { canvas: CanvasState }) => state.canvas.isLoading;
export const selectCanvasError = (state: { canvas: CanvasState }) => state.canvas.error;
// Phase 4 sync selectors
export const selectConnectionStatus = (state: { canvas: CanvasState }) => state.canvas.isConnected;
export const selectLastSyncTime = (state: { canvas: CanvasState }) => state.canvas.lastSyncTime;
export const selectSyncState = (state: { canvas: CanvasState }) => state.canvas.syncState;

// Export reducer as default
export default canvasSlice.reducer;
