import { describe, it, expect, vi } from 'vitest';
import {
  generateObjectId,
  getRandomRectangleColor,
  calculateNextZIndex,
  createRectangle,
  calculateViewportCenter,
  checkRectangleOverlap,
  findOverlappingObjects,
  sortObjectsByZIndex,
  findTopmostObjectAt,
} from '../src/utils/canvasObjects';
import { COLOR_PALETTE } from '../src/utils/colorHash';
import { Rectangle, CANVAS_CONFIG } from '../src/types/canvas';

describe('canvasObjects utilities', () => {
  describe('generateObjectId', () => {
    it('should generate unique UUIDs', () => {
      const id1 = generateObjectId();
      const id2 = generateObjectId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });
  });

  describe('getRandomRectangleColor', () => {
    it('should return a color from the palette', () => {
      const color = getRandomRectangleColor();
      expect(COLOR_PALETTE).toContain(color);
    });

    it('should potentially return all colors', () => {
      // Mock Math.random to test all color selections
      const originalRandom = Math.random;
      const colors = new Set();
      
      // Test each palette index
      COLOR_PALETTE.forEach((_, index) => {
        vi.spyOn(Math, 'random').mockReturnValue(index / COLOR_PALETTE.length);
        const color = getRandomRectangleColor();
        colors.add(color);
        vi.restoreAllMocks();
      });
      
      // Should be able to select all colors
      expect(colors.size).toBe(COLOR_PALETTE.length);
      
      Math.random = originalRandom;
    });
  });

  describe('calculateNextZIndex', () => {
    it('should return 1 for empty array', () => {
      expect(calculateNextZIndex([])).toBe(1);
    });

    it('should return max + 1 for existing objects', () => {
      const objects: Rectangle[] = [
        { zIndex: 5 } as Rectangle,
        { zIndex: 2 } as Rectangle,
        { zIndex: 10 } as Rectangle,
      ];
      
      expect(calculateNextZIndex(objects)).toBe(11);
    });

    it('should handle single object', () => {
      const objects: Rectangle[] = [
        { zIndex: 3 } as Rectangle,
      ];
      
      expect(calculateNextZIndex(objects)).toBe(4);
    });
  });

  describe('createRectangle', () => {
    it('should create rectangle with default properties', () => {
      const rect = createRectangle(100, 200);
      
      expect(rect.type).toBe('rectangle');
      expect(rect.x).toBe(100);
      expect(rect.y).toBe(200);
      expect(rect.width).toBe(CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH);
      expect(rect.height).toBe(CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT);
      expect(rect.stroke).toBe('black');
      expect(rect.strokeWidth).toBe(1);
      expect(rect.opacity).toBe(1.0);
      expect(rect.rotation).toBe(0);
      expect(rect.zIndex).toBe(1);
      expect(COLOR_PALETTE).toContain(rect.fill);
      expect(rect.id).toBeTruthy();
      expect(rect.createdAt).toBeTruthy();
      expect(rect.updatedAt).toBe(rect.createdAt);
    });

    it('should calculate correct z-index with existing objects', () => {
      const existing: Rectangle[] = [
        { zIndex: 3 } as Rectangle,
        { zIndex: 1 } as Rectangle,
      ];
      
      const rect = createRectangle(0, 0, existing);
      expect(rect.zIndex).toBe(4);
    });
  });

  describe('calculateViewportCenter', () => {
    it('should return viewport center coordinates', () => {
      const viewport = { x: 1000, y: 800, zoom: 1.5 };
      const center = calculateViewportCenter(viewport, 800, 600);
      
      expect(center.x).toBe(1000);
      expect(center.y).toBe(800);
    });
  });

  describe('checkRectangleOverlap', () => {
    it('should detect overlapping rectangles', () => {
      const rect1: Rectangle = {
        x: 0, y: 0, width: 100, height: 100, rotation: 0
      } as Rectangle;
      
      const rect2: Rectangle = {
        x: 50, y: 50, width: 100, height: 100, rotation: 0
      } as Rectangle;
      
      expect(checkRectangleOverlap(rect1, rect2)).toBe(true);
    });

    it('should detect non-overlapping rectangles', () => {
      const rect1: Rectangle = {
        x: 0, y: 0, width: 100, height: 100, rotation: 0
      } as Rectangle;
      
      const rect2: Rectangle = {
        x: 200, y: 200, width: 100, height: 100, rotation: 0
      } as Rectangle;
      
      expect(checkRectangleOverlap(rect1, rect2)).toBe(false);
    });

    it('should handle edge touching rectangles', () => {
      const rect1: Rectangle = {
        x: 0, y: 0, width: 100, height: 100, rotation: 0
      } as Rectangle;
      
      const rect2: Rectangle = {
        x: 100, y: 0, width: 100, height: 100, rotation: 0
      } as Rectangle;
      
      expect(checkRectangleOverlap(rect1, rect2)).toBe(false);
    });

    it('should detect various overlap scenarios', () => {
      const rect1: Rectangle = {
        x: 10, y: 10, width: 80, height: 80, rotation: 0
      } as Rectangle;
      
      // Completely inside
      const rect2: Rectangle = {
        x: 20, y: 20, width: 40, height: 40, rotation: 0
      } as Rectangle;
      
      expect(checkRectangleOverlap(rect1, rect2)).toBe(true);
      
      // Partially overlapping
      const rect3: Rectangle = {
        x: 70, y: 70, width: 60, height: 60, rotation: 0
      } as Rectangle;
      
      expect(checkRectangleOverlap(rect1, rect3)).toBe(true);
    });
  });

  describe('findOverlappingObjects', () => {
    it('should find overlapping rectangles', () => {
      const newRect: Rectangle = {
        id: 'new', x: 50, y: 50, width: 100, height: 100, rotation: 0
      } as Rectangle;
      
      const existing: Rectangle[] = [
        { id: 'rect1', x: 0, y: 0, width: 100, height: 100, rotation: 0, type: 'rectangle' } as Rectangle,
        { id: 'rect2', x: 200, y: 200, width: 100, height: 100, rotation: 0, type: 'rectangle' } as Rectangle,
        { id: 'rect3', x: 75, y: 75, width: 100, height: 100, rotation: 0, type: 'rectangle' } as Rectangle,
      ];
      
      const overlapping = findOverlappingObjects(newRect, existing);
      
      expect(overlapping).toHaveLength(2);
      expect(overlapping.map(r => r.id)).toContain('rect1');
      expect(overlapping.map(r => r.id)).toContain('rect3');
      expect(overlapping.map(r => r.id)).not.toContain('rect2');
    });

    it('should exclude self from overlap detection', () => {
      const rect: Rectangle = {
        id: 'test', x: 0, y: 0, width: 100, height: 100, rotation: 0, type: 'rectangle'
      } as Rectangle;
      
      const existing: Rectangle[] = [rect];
      
      const overlapping = findOverlappingObjects(rect, existing);
      expect(overlapping).toHaveLength(0);
    });
  });

  describe('sortObjectsByZIndex', () => {
    it('should sort objects by z-index ascending', () => {
      const objects: Rectangle[] = [
        { id: 'c', zIndex: 5 } as Rectangle,
        { id: 'a', zIndex: 1 } as Rectangle,
        { id: 'b', zIndex: 3 } as Rectangle,
      ];
      
      const sorted = sortObjectsByZIndex(objects);
      
      expect(sorted.map(o => o.id)).toEqual(['a', 'b', 'c']);
      expect(sorted.map(o => o.zIndex)).toEqual([1, 3, 5]);
    });

    it('should not mutate original array', () => {
      const objects: Rectangle[] = [
        { id: 'c', zIndex: 5 } as Rectangle,
        { id: 'a', zIndex: 1 } as Rectangle,
      ];
      
      const sorted = sortObjectsByZIndex(objects);
      
      expect(sorted).not.toBe(objects);
      expect(objects[0].id).toBe('c'); // Original unchanged
    });
  });

  describe('findTopmostObjectAt', () => {
    it('should find topmost rectangle at coordinates', () => {
      const objects: Rectangle[] = [
        { 
          id: 'bottom', 
          x: 0, y: 0, width: 100, height: 100, 
          rotation: 0, zIndex: 1, 
          type: 'rectangle' 
        } as Rectangle,
        { 
          id: 'top', 
          x: 10, y: 10, width: 100, height: 100, 
          rotation: 0, zIndex: 5, 
          type: 'rectangle' 
        } as Rectangle,
      ];
      
      const topmost = findTopmostObjectAt(50, 50, objects);
      
      expect(topmost?.id).toBe('top');
    });

    it('should return null if no object at coordinates', () => {
      const objects: Rectangle[] = [
        { 
          id: 'rect', 
          x: 0, y: 0, width: 100, height: 100, 
          rotation: 0, zIndex: 1, 
          type: 'rectangle' 
        } as Rectangle,
      ];
      
      const topmost = findTopmostObjectAt(200, 200, objects);
      
      expect(topmost).toBeNull();
    });

    it('should handle empty object array', () => {
      const topmost = findTopmostObjectAt(50, 50, []);
      expect(topmost).toBeNull();
    });

    it('should find correct object in complex overlap scenario', () => {
      const objects: Rectangle[] = [
        { id: 'rect1', x: 0, y: 0, width: 200, height: 200, rotation: 0, zIndex: 1, type: 'rectangle' } as Rectangle,
        { id: 'rect2', x: 50, y: 50, width: 100, height: 100, rotation: 0, zIndex: 3, type: 'rectangle' } as Rectangle,
        { id: 'rect3', x: 75, y: 75, width: 50, height: 50, rotation: 0, zIndex: 2, type: 'rectangle' } as Rectangle,
      ];
      
      // Point that intersects all three rectangles
      const topmost = findTopmostObjectAt(100, 100, objects);
      
      expect(topmost?.id).toBe('rect2'); // Highest z-index
    });
  });
});
