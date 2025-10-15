import { configureStore } from '@reduxjs/toolkit';
import canvasReducer, {
  addRectangle,
  updateObject,
  bringToFront,
  setConnectionStatus,
  setSyncTime,
  updateSyncState,
  mergeRemoteObjects,
  selectCanvasObjects,
  selectConnectionStatus,
  selectLastSyncTime,
  selectSyncState,
  CanvasState
} from '../src/store/canvasSlice';
import { Rectangle, CanvasObject } from '../src/types/canvas';

describe('canvasSlice sync functionality', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        canvas: canvasReducer
      }
    });
  });

  const createTestRectangle = (overrides: Partial<Rectangle> = {}): Rectangle => ({
    id: 'test-rect-1',
    type: 'rectangle',
    x: 100,
    y: 100,
    width: 150,
    height: 150,
    fill: 'crimson',
    stroke: 'black',
    strokeWidth: 1,
    opacity: 1.0,
    rotation: 0,
    zIndex: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastModifiedBy: 'user1',
    ...overrides
  });

  describe('addRectangle with userId', () => {
    it('should add rectangle with lastModifiedBy field', () => {
      store.dispatch(addRectangle({ x: 100, y: 100, userId: 'user123' }));
      
      const objects = selectCanvasObjects(store.getState());
      expect(objects).toHaveLength(1);
      expect(objects[0].lastModifiedBy).toBe('user123');
      expect(objects[0].x).toBe(100);
      expect(objects[0].y).toBe(100);
    });
  });

  describe('updateObject with userId', () => {
    it('should update object with lastModifiedBy when userId provided', () => {
      // Add initial object
      store.dispatch(addRectangle({ x: 100, y: 100, userId: 'user1' }));
      const objects = selectCanvasObjects(store.getState());
      const objectId = objects[0].id;

      // Update with different user
      store.dispatch(updateObject({
        id: objectId,
        updates: { x: 200 },
        userId: 'user2'
      }));

      const updatedObjects = selectCanvasObjects(store.getState());
      const updatedObject = updatedObjects[0];
      
      expect(updatedObject.x).toBe(200);
      expect(updatedObject.lastModifiedBy).toBe('user2');
    });

    it('should update object without changing lastModifiedBy when userId not provided', () => {
      // Add initial object
      store.dispatch(addRectangle({ x: 100, y: 100, userId: 'user1' }));
      const objects = selectCanvasObjects(store.getState());
      const objectId = objects[0].id;
      const originalLastModified = objects[0].lastModifiedBy;

      // Update without userId
      store.dispatch(updateObject({
        id: objectId,
        updates: { x: 200 }
      }));

      const updatedObjects = selectCanvasObjects(store.getState());
      const updatedObject = updatedObjects[0];
      
      expect(updatedObject.x).toBe(200);
      expect(updatedObject.lastModifiedBy).toBe(originalLastModified);
    });
  });

  describe('bringToFront with userId', () => {
    it('should update zIndex and lastModifiedBy when userId provided', () => {
      // Add initial object
      store.dispatch(addRectangle({ x: 100, y: 100, userId: 'user1' }));
      const objects = selectCanvasObjects(store.getState());
      const objectId = objects[0].id;
      const originalZIndex = objects[0].zIndex;

      // Bring to front with different user
      store.dispatch(bringToFront({ objectId, userId: 'user2' }));

      const updatedObjects = selectCanvasObjects(store.getState());
      const updatedObject = updatedObjects[0];
      
      expect(updatedObject.zIndex).toBeGreaterThan(originalZIndex);
      expect(updatedObject.lastModifiedBy).toBe('user2');
    });

    it('should update zIndex without changing lastModifiedBy when userId not provided', () => {
      // Add initial object
      store.dispatch(addRectangle({ x: 100, y: 100, userId: 'user1' }));
      const objects = selectCanvasObjects(store.getState());
      const objectId = objects[0].id;
      const originalZIndex = objects[0].zIndex;
      const originalLastModified = objects[0].lastModifiedBy;

      // Bring to front without userId
      store.dispatch(bringToFront({ objectId }));

      const updatedObjects = selectCanvasObjects(store.getState());
      const updatedObject = updatedObjects[0];
      
      expect(updatedObject.zIndex).toBeGreaterThan(originalZIndex);
      expect(updatedObject.lastModifiedBy).toBe(originalLastModified);
    });
  });

  describe('sync state actions', () => {
    it('should set connection status', () => {
      expect(selectConnectionStatus(store.getState())).toBe(false);
      
      store.dispatch(setConnectionStatus(true));
      expect(selectConnectionStatus(store.getState())).toBe(true);
      
      store.dispatch(setConnectionStatus(false));
      expect(selectConnectionStatus(store.getState())).toBe(false);
    });

    it('should set sync time', () => {
      const now = Date.now();
      expect(selectLastSyncTime(store.getState())).toBe(null);
      
      store.dispatch(setSyncTime(now));
      expect(selectLastSyncTime(store.getState())).toBe(now);
    });

    it('should update sync state', () => {
      const syncState = {
        'obj1': {
          position: { x: 100, y: 100 },
          size: { width: 150, height: 150 },
          rotation: 0,
          lastSyncTime: Date.now()
        }
      };
      
      expect(selectSyncState(store.getState())).toEqual({});
      
      store.dispatch(updateSyncState(syncState));
      expect(selectSyncState(store.getState())).toEqual(syncState);
    });
  });

  describe('mergeRemoteObjects with echo prevention', () => {
    beforeEach(() => {
      // Add some initial local objects
      store.dispatch(addRectangle({ x: 100, y: 100, userId: 'user1' }));
      store.dispatch(addRectangle({ x: 200, y: 200, userId: 'user2' }));
    });

    it('should merge remote objects and filter out echo updates', () => {
      const localObjects = selectCanvasObjects(store.getState());
      const obj1Id = localObjects[0].id;
      const obj2Id = localObjects[1].id;

      // Simulate remote objects with some from current user (echoes) and some from others
      const remoteObjects: CanvasObject[] = [
        { ...localObjects[0], x: 150, lastModifiedBy: 'user1' }, // Echo from current user
        { ...localObjects[1], x: 250, lastModifiedBy: 'user3' }, // From different user
        createTestRectangle({ id: 'new-obj', x: 300, y: 300, lastModifiedBy: 'user4' }) // New object
      ];

      store.dispatch(mergeRemoteObjects({
        objects: remoteObjects,
        currentUserId: 'user1'
      }));

      const mergedObjects = selectCanvasObjects(store.getState());
      
      // Should have 3 objects total
      expect(mergedObjects).toHaveLength(3);
      
      // Check that echo update was ignored (obj1 should keep original x position)
      const obj1 = mergedObjects.find(obj => obj.id === obj1Id);
      expect(obj1?.x).toBe(100); // Original position, not 150 from echo
      
      // Check that non-echo update was applied
      const obj2 = mergedObjects.find(obj => obj.id === obj2Id);
      expect(obj2?.x).toBe(250); // Updated position from user3
      
      // Check that new object was added
      const newObj = mergedObjects.find(obj => obj.id === 'new-obj');
      expect(newObj).toBeDefined();
      expect(newObj?.x).toBe(300);
    });

    it('should handle remote objects with no local matches', () => {
      const remoteObjects: CanvasObject[] = [
        createTestRectangle({ id: 'remote-1', x: 400, y: 400, lastModifiedBy: 'user3' }),
        createTestRectangle({ id: 'remote-2', x: 500, y: 500, lastModifiedBy: 'user4' })
      ];

      store.dispatch(mergeRemoteObjects({
        objects: remoteObjects,
        currentUserId: 'user1'
      }));

      const mergedObjects = selectCanvasObjects(store.getState());
      
      // Should have local (2) + remote (2) = 4 objects
      expect(mergedObjects).toHaveLength(4);
      
      // Check remote objects were added
      const remoteObj1 = mergedObjects.find(obj => obj.id === 'remote-1');
      const remoteObj2 = mergedObjects.find(obj => obj.id === 'remote-2');
      
      expect(remoteObj1).toBeDefined();
      expect(remoteObj1?.x).toBe(400);
      expect(remoteObj2).toBeDefined();
      expect(remoteObj2?.x).toBe(500);
    });

    it('should clear selection when selected object is removed in remote update', () => {
      const localObjects = selectCanvasObjects(store.getState());
      const obj1Id = localObjects[0].id;
      
      // Select an object
      store.dispatch({ type: 'canvas/selectObject', payload: obj1Id });
      
      // Remote update that doesn't include the selected object
      const remoteObjects: CanvasObject[] = [
        createTestRectangle({ id: 'new-obj', x: 300, y: 300, lastModifiedBy: 'user3' })
      ];

      store.dispatch(mergeRemoteObjects({
        objects: remoteObjects,
        currentUserId: 'user1'
      }));

      const state = store.getState().canvas;
      expect(state.selection.selectedObjectId).toBe(null);
    });

    it('should preserve selection when selected object exists in remote update', () => {
      const localObjects = selectCanvasObjects(store.getState());
      const obj1Id = localObjects[0].id;
      
      // Select an object
      store.dispatch({ type: 'canvas/selectObject', payload: obj1Id });
      
      // Remote update that includes the selected object
      const remoteObjects: CanvasObject[] = [
        { ...localObjects[0], x: 150, lastModifiedBy: 'user3' }, // Non-echo update
        createTestRectangle({ id: 'new-obj', x: 300, y: 300, lastModifiedBy: 'user4' })
      ];

      store.dispatch(mergeRemoteObjects({
        objects: remoteObjects,
        currentUserId: 'user1'
      }));

      const state = store.getState().canvas;
      expect(state.selection.selectedObjectId).toBe(obj1Id);
    });
  });
});
