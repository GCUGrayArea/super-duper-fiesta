import {
  shouldSyncPositionChange,
  shouldSyncSizeChange,
  shouldSyncRotationChange,
  shouldSyncObjectChanges,
  snapObjectToThreshold,
  isEchoUpdate,
  filterEchoUpdates,
  createUpdatePayload,
  updateSyncStateTracking,
  getLastSyncedState
} from '../src/utils/syncHelpers';
import { Rectangle, CANVAS_CONFIG } from '../src/types/canvas';

describe('syncHelpers', () => {
  describe('shouldSyncPositionChange', () => {
    it('should return false for changes below threshold', () => {
      const original = { x: 100, y: 100 };
      const current = { x: 103, y: 102 }; // ~3.6px total delta
      
      expect(shouldSyncPositionChange(original, current)).toBe(false);
    });

    it('should return true for changes at or above threshold', () => {
      const original = { x: 100, y: 100 };
      const current = { x: 105, y: 100 }; // 5px delta
      
      expect(shouldSyncPositionChange(original, current)).toBe(true);
    });

    it('should return true for diagonal movement above threshold', () => {
      const original = { x: 0, y: 0 };
      const current = { x: 4, y: 4 }; // ~5.66px total delta
      
      expect(shouldSyncPositionChange(original, current)).toBe(true);
    });
  });

  describe('shouldSyncSizeChange', () => {
    it('should return false for changes below threshold', () => {
      const original = { width: 100, height: 100 };
      const current = { width: 104, height: 103 };
      
      expect(shouldSyncSizeChange(original, current)).toBe(false);
    });

    it('should return true when width change exceeds threshold', () => {
      const original = { width: 100, height: 100 };
      const current = { width: 105, height: 100 };
      
      expect(shouldSyncSizeChange(original, current)).toBe(true);
    });

    it('should return true when height change exceeds threshold', () => {
      const original = { width: 100, height: 100 };
      const current = { width: 100, height: 105 };
      
      expect(shouldSyncSizeChange(original, current)).toBe(true);
    });
  });

  describe('shouldSyncRotationChange', () => {
    it('should return false for changes below threshold', () => {
      expect(shouldSyncRotationChange(0, 4)).toBe(false);
      expect(shouldSyncRotationChange(45, 48)).toBe(false);
    });

    it('should return true for changes at or above threshold', () => {
      expect(shouldSyncRotationChange(0, 5)).toBe(true);
      expect(shouldSyncRotationChange(45, 50)).toBe(true);
    });

    it('should handle angle wrapping correctly', () => {
      expect(shouldSyncRotationChange(358, 2)).toBe(false); // 4 degree diff
      expect(shouldSyncRotationChange(355, 5)).toBe(true); // 10 degree diff (wrapped)
      expect(shouldSyncRotationChange(0, 355)).toBe(false); // 5 degree diff (wrapped)
    });
  });

  describe('shouldSyncObjectChanges', () => {
    const createTestRectangle = (overrides: Partial<Rectangle> = {}): Rectangle => ({
      id: 'test-rect',
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

    it('should return false when no changes exceed thresholds', () => {
      const original = createTestRectangle();
      const current = createTestRectangle({ x: 103, y: 102, width: 152, rotation: 3 });
      
      expect(shouldSyncObjectChanges(original, current)).toBe(false);
    });

    it('should return true when position exceeds threshold', () => {
      const original = createTestRectangle();
      const current = createTestRectangle({ x: 105, y: 100 });
      
      expect(shouldSyncObjectChanges(original, current)).toBe(true);
    });

    it('should return true when size exceeds threshold', () => {
      const original = createTestRectangle();
      const current = createTestRectangle({ width: 155 });
      
      expect(shouldSyncObjectChanges(original, current)).toBe(true);
    });

    it('should return true when rotation exceeds threshold', () => {
      const original = createTestRectangle();
      const current = createTestRectangle({ rotation: 5 });
      
      expect(shouldSyncObjectChanges(original, current)).toBe(true);
    });
  });

  describe('snapObjectToThreshold', () => {
    const createTestRectangle = (overrides: Partial<Rectangle> = {}): Rectangle => ({
      id: 'test-rect',
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

    it('should return current state when changes exceed threshold', () => {
      const original = createTestRectangle();
      const current = createTestRectangle({ x: 105, y: 100, fill: 'hotpink' });
      
      const result = snapObjectToThreshold(original, current);
      expect(result).toEqual(current);
    });

    it('should snap back to original position/size/rotation when below threshold', () => {
      const original = createTestRectangle();
      const current = createTestRectangle({ 
        x: 103, 
        y: 102, 
        width: 152, 
        rotation: 3, 
        fill: 'hotpink',
        zIndex: 5 
      });
      
      const result = snapObjectToThreshold(original, current) as Rectangle;
      
      // Should snap back position, size, rotation
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
      expect(result.width).toBe(150);
      expect(result.rotation).toBe(0);
      
      // Should keep other changes
      expect(result.fill).toBe('hotpink');
      expect(result.zIndex).toBe(5);
    });
  });

  describe('isEchoUpdate', () => {
    it('should return true when lastModifiedBy matches current user', () => {
      const update = { lastModifiedBy: 'user123' };
      expect(isEchoUpdate(update, 'user123')).toBe(true);
    });

    it('should return false when lastModifiedBy is different user', () => {
      const update = { lastModifiedBy: 'user456' };
      expect(isEchoUpdate(update, 'user123')).toBe(false);
    });
  });

  describe('filterEchoUpdates', () => {
    const createTestObject = (userId: string, id: string = 'obj1'): Rectangle => ({
      id,
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
      lastModifiedBy: userId,
    });

    it('should filter out objects modified by current user', () => {
      const objects = [
        createTestObject('user123', 'obj1'),
        createTestObject('user456', 'obj2'),
        createTestObject('user123', 'obj3'),
        createTestObject('user789', 'obj4'),
      ];

      const filtered = filterEchoUpdates(objects, 'user123');
      
      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('obj2');
      expect(filtered[1].id).toBe('obj4');
    });

    it('should return empty array when all objects are from current user', () => {
      const objects = [
        createTestObject('user123', 'obj1'),
        createTestObject('user123', 'obj2'),
      ];

      const filtered = filterEchoUpdates(objects, 'user123');
      expect(filtered).toHaveLength(0);
    });
  });

  describe('createUpdatePayload', () => {
    const createTestRectangle = (overrides: Partial<Rectangle> = {}): Rectangle => ({
      id: 'test-rect',
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

    it('should include only changed fields', () => {
      const original = createTestRectangle();
      const updated = createTestRectangle({ 
        x: 200, 
        fill: 'hotpink', 
        updatedAt: Date.now() + 1000,
        lastModifiedBy: 'user2'
      });

      const payload = createUpdatePayload(original, updated);

      expect(payload).toEqual({
        id: 'test-rect',
        x: 200,
        fill: 'hotpink',
        updatedAt: updated.updatedAt,
        lastModifiedBy: 'user2'
      });
    });

    it('should always include id, updatedAt, and lastModifiedBy', () => {
      const original = createTestRectangle();
      const updated = createTestRectangle({ 
        updatedAt: Date.now() + 1000,
        lastModifiedBy: 'user2'
      });

      const payload = createUpdatePayload(original, updated);

      expect(payload.id).toBe('test-rect');
      expect(payload.updatedAt).toBe(updated.updatedAt);
      expect(payload.lastModifiedBy).toBe('user2');
      expect(Object.keys(payload)).toHaveLength(3);
    });
  });

  describe('sync state tracking', () => {
    const createTestRectangle = (): Rectangle => ({
      id: 'test-rect',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 150,
      height: 150,
      fill: 'crimson',
      stroke: 'black',
      strokeWidth: 1,
      opacity: 1.0,
      rotation: 45,
      zIndex: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastModifiedBy: 'user1',
    });

    describe('updateSyncStateTracking', () => {
      it('should track object state correctly', () => {
        const obj = createTestRectangle();
        const syncState = updateSyncStateTracking({}, obj);

        expect(syncState['test-rect']).toEqual({
          position: { x: 100, y: 100 },
          size: { width: 150, height: 150 },
          rotation: 45,
          lastSyncTime: expect.any(Number)
        });
      });

      it('should update existing tracking', () => {
        const obj1 = createTestRectangle();
        const obj2 = { ...obj1, x: 200, rotation: 90 };
        
        let syncState = updateSyncStateTracking({}, obj1);
        syncState = updateSyncStateTracking(syncState, obj2);

        expect(syncState['test-rect'].position).toEqual({ x: 200, y: 100 });
        expect(syncState['test-rect'].rotation).toBe(90);
      });
    });

    describe('getLastSyncedState', () => {
      it('should return tracked state when exists', () => {
        const obj = createTestRectangle();
        const syncState = updateSyncStateTracking({}, obj);
        
        const tracked = getLastSyncedState(syncState, 'test-rect');
        expect(tracked).toEqual({
          position: { x: 100, y: 100 },
          size: { width: 150, height: 150 },
          rotation: 45,
          lastSyncTime: expect.any(Number)
        });
      });

      it('should return null when object not tracked', () => {
        const tracked = getLastSyncedState({}, 'unknown-id');
        expect(tracked).toBeNull();
      });
    });
  });
});

