import { describe, it, expect } from 'vitest';
import canvasReducer, {
  addRectangle,
  updateObject,
  deleteObject,
  bringToFront,
  selectObject,
  updateViewport,
  panViewport,
  zoomViewport,
  clearCanvas,
  replaceObjects,
  CanvasState,
} from '../src/store/canvasSlice';
import { CANVAS_CONFIG } from '../src/types/canvas';

describe('canvasSlice', () => {
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
  };

  describe('addRectangle', () => {
    it('should add rectangle at specified position', () => {
      const action = addRectangle({ x: 100, y: 200 });
      const state = canvasReducer(initialState, action);

      expect(state.objects).toHaveLength(1);
      
      const rect = state.objects[0];
      expect(rect.type).toBe('rectangle');
      expect(rect.x).toBe(100);
      expect(rect.y).toBe(200);
      expect(rect.width).toBe(CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH);
      expect(rect.height).toBe(CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT);
      expect(rect.zIndex).toBe(1);
      expect(state.selection.selectedObjectId).toBe(rect.id);
    });

    it('should assign correct z-index with existing objects', () => {
      const stateWithObjects = {
        ...initialState,
        objects: [
          { id: '1', zIndex: 3 } as any,
          { id: '2', zIndex: 1 } as any,
        ],
      };

      const action = addRectangle({ x: 0, y: 0 });
      const state = canvasReducer(stateWithObjects, action);

      const newRect = state.objects[2];
      expect(newRect.zIndex).toBe(4); // max(3, 1) + 1
    });
  });

  describe('updateObject', () => {
    it('should update object properties', () => {
      const existingState = {
        ...initialState,
        objects: [
          { id: 'rect1', x: 0, y: 0, updatedAt: 1000 } as any,
        ],
      };

      const action = updateObject({
        id: 'rect1',
        updates: { x: 100, y: 200 },
      });
      
      const state = canvasReducer(existingState, action);
      const updatedRect = state.objects[0];
      
      expect(updatedRect.x).toBe(100);
      expect(updatedRect.y).toBe(200);
      expect(updatedRect.updatedAt).toBeGreaterThan(1000);
    });

    it('should not update non-existent object', () => {
      const action = updateObject({
        id: 'nonexistent',
        updates: { x: 100 },
      });
      
      const state = canvasReducer(initialState, action);
      expect(state.objects).toHaveLength(0);
    });
  });

  describe('deleteObject', () => {
    it('should remove object from objects array', () => {
      const existingState = {
        ...initialState,
        objects: [
          { id: 'rect1', x: 0, y: 0 } as any,
          { id: 'rect2', x: 100, y: 100 } as any,
        ],
      };

      const action = deleteObject('rect1');
      const state = canvasReducer(existingState, action);

      expect(state.objects).toHaveLength(1);
      expect(state.objects[0].id).toBe('rect2');
    });

    it('should clear selection if deleted object was selected', () => {
      const existingState = {
        ...initialState,
        objects: [{ id: 'rect1', x: 0, y: 0 } as any],
        selection: { selectedObjectId: 'rect1' },
      };

      const action = deleteObject('rect1');
      const state = canvasReducer(existingState, action);

      expect(state.objects).toHaveLength(0);
      expect(state.selection.selectedObjectId).toBeNull();
    });

    it('should not clear selection if different object deleted', () => {
      const existingState = {
        ...initialState,
        objects: [
          { id: 'rect1', x: 0, y: 0 } as any,
          { id: 'rect2', x: 100, y: 100 } as any,
        ],
        selection: { selectedObjectId: 'rect1' },
      };

      const action = deleteObject('rect2');
      const state = canvasReducer(existingState, action);

      expect(state.objects).toHaveLength(1);
      expect(state.selection.selectedObjectId).toBe('rect1');
    });
  });

  describe('bringToFront', () => {
    it('should update object z-index to highest', () => {
      const existingState = {
        ...initialState,
        objects: [
          { id: 'rect1', zIndex: 1, updatedAt: 1000 } as any,
          { id: 'rect2', zIndex: 3, updatedAt: 1000 } as any,
          { id: 'rect3', zIndex: 2, updatedAt: 1000 } as any,
        ],
      };

      const action = bringToFront('rect1');
      const state = canvasReducer(existingState, action);

      const updatedRect = state.objects.find(obj => obj.id === 'rect1')!;
      expect(updatedRect.zIndex).toBe(4); // max(1,3,2) + 1
      expect(updatedRect.updatedAt).toBeGreaterThan(1000);
    });

    it('should not update non-existent object', () => {
      const action = bringToFront('nonexistent');
      const state = canvasReducer(initialState, action);
      expect(state.objects).toHaveLength(0);
    });
  });

  describe('selectObject', () => {
    it('should set selected object ID', () => {
      const action = selectObject('rect1');
      const state = canvasReducer(initialState, action);
      expect(state.selection.selectedObjectId).toBe('rect1');
    });

    it('should clear selection with null', () => {
      const existingState = {
        ...initialState,
        selection: { selectedObjectId: 'rect1' },
      };

      const action = selectObject(null);
      const state = canvasReducer(existingState, action);
      expect(state.selection.selectedObjectId).toBeNull();
    });
  });

  describe('updateViewport', () => {
    it('should update viewport properties', () => {
      const action = updateViewport({ x: 1000, zoom: 2.0 });
      const state = canvasReducer(initialState, action);

      expect(state.viewport.x).toBe(1000);
      expect(state.viewport.zoom).toBe(2.0);
      expect(state.viewport.y).toBe(CANVAS_CONFIG.DEFAULT_VIEWPORT_Y); // Unchanged
    });
  });

  describe('panViewport', () => {
    it('should update viewport position by delta', () => {
      const existingState = {
        ...initialState,
        viewport: { x: 1000, y: 800, zoom: 1.0 },
      };

      const action = panViewport({ deltaX: 100, deltaY: -50 });
      const state = canvasReducer(existingState, action);

      expect(state.viewport.x).toBe(1100);
      expect(state.viewport.y).toBe(750);
    });

    it('should constrain panning within world boundaries', () => {
      const existingState = {
        ...initialState,
        viewport: { x: 100, y: 100, zoom: 1.0 },
      };

      // Try to pan beyond left/top boundaries
      const action = panViewport({ deltaX: -200, deltaY: -200 });
      const state = canvasReducer(existingState, action);

      // Should be constrained to half viewport size
      const minX = (CANVAS_CONFIG.VIEWPORT_WIDTH / 2) / 1.0;
      const minY = (CANVAS_CONFIG.VIEWPORT_HEIGHT / 2) / 1.0;
      
      expect(state.viewport.x).toBe(minX);
      expect(state.viewport.y).toBe(minY);
    });

    it('should constrain panning at zoom levels', () => {
      const existingState = {
        ...initialState,
        viewport: { x: 4900, y: 4900, zoom: 2.0 },
      };

      // Try to pan beyond right/bottom at 2x zoom
      const action = panViewport({ deltaX: 200, deltaY: 200 });
      const state = canvasReducer(existingState, action);

      // Should be constrained
      const maxX = CANVAS_CONFIG.WORLD_WIDTH - (CANVAS_CONFIG.VIEWPORT_WIDTH / 2) / 2.0;
      const maxY = CANVAS_CONFIG.WORLD_HEIGHT - (CANVAS_CONFIG.VIEWPORT_HEIGHT / 2) / 2.0;
      
      expect(state.viewport.x).toBe(maxX);
      expect(state.viewport.y).toBe(maxY);
    });
  });

  describe('zoomViewport', () => {
    it('should update zoom level', () => {
      const action = zoomViewport({ delta: 1 });
      const state = canvasReducer(initialState, action);

      // 1.0 + (1 * 0.1) = 1.1
      expect(state.viewport.zoom).toBeCloseTo(1.1);
    });

    it('should constrain zoom within limits', () => {
      // Test minimum zoom
      const stateMinZoom = {
        ...initialState,
        viewport: { ...initialState.viewport, zoom: 0.1 },
      };

      const actionZoomOut = zoomViewport({ delta: -5 });
      const stateAfterZoomOut = canvasReducer(stateMinZoom, actionZoomOut);
      expect(stateAfterZoomOut.viewport.zoom).toBe(CANVAS_CONFIG.MIN_ZOOM);

      // Test maximum zoom
      const stateMaxZoom = {
        ...initialState,
        viewport: { ...initialState.viewport, zoom: 4.0 },
      };

      const actionZoomIn = zoomViewport({ delta: 5 });
      const stateAfterZoomIn = canvasReducer(stateMaxZoom, actionZoomIn);
      expect(stateAfterZoomIn.viewport.zoom).toBe(CANVAS_CONFIG.MAX_ZOOM);
    });

    it('should zoom towards specified center point', () => {
      const existingState = {
        ...initialState,
        viewport: { x: 1000, y: 1000, zoom: 1.0 },
      };

      const action = zoomViewport({
        delta: 1,
        centerX: 1200,
        centerY: 800,
      });
      
      const state = canvasReducer(existingState, action);
      
      expect(state.viewport.zoom).toBeCloseTo(1.1);
      // Position should adjust to zoom towards the center point
      expect(state.viewport.x).not.toBe(1000);
      expect(state.viewport.y).not.toBe(1000);
    });
  });

  describe('clearCanvas', () => {
    it('should remove all objects and clear selection', () => {
      const existingState = {
        ...initialState,
        objects: [
          { id: 'rect1', x: 0, y: 0 } as any,
          { id: 'rect2', x: 100, y: 100 } as any,
        ],
        selection: { selectedObjectId: 'rect1' },
      };

      const action = clearCanvas();
      const state = canvasReducer(existingState, action);

      expect(state.objects).toHaveLength(0);
      expect(state.selection.selectedObjectId).toBeNull();
    });
  });

  describe('replaceObjects', () => {
    it('should replace all objects with new array', () => {
      const newObjects = [
        { id: 'new1', zIndex: 2 } as any,
        { id: 'new2', zIndex: 1 } as any,
      ];

      const action = replaceObjects(newObjects);
      const state = canvasReducer(initialState, action);

      expect(state.objects).toHaveLength(2);
      expect(state.objects[0].zIndex).toBe(1); // Sorted by z-index
      expect(state.objects[1].zIndex).toBe(2);
    });

    it('should clear selection if selected object no longer exists', () => {
      const existingState = {
        ...initialState,
        selection: { selectedObjectId: 'oldRect' },
      };

      const newObjects = [{ id: 'newRect', zIndex: 1 } as any];
      const action = replaceObjects(newObjects);
      const state = canvasReducer(existingState, action);

      expect(state.selection.selectedObjectId).toBeNull();
    });

    it('should preserve selection if selected object exists', () => {
      const existingState = {
        ...initialState,
        selection: { selectedObjectId: 'keepRect' },
      };

      const newObjects = [
        { id: 'keepRect', zIndex: 1 } as any,
        { id: 'newRect', zIndex: 2 } as any,
      ];
      
      const action = replaceObjects(newObjects);
      const state = canvasReducer(existingState, action);

      expect(state.selection.selectedObjectId).toBe('keepRect');
    });
  });
});
