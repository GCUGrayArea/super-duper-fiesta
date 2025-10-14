import { describe, it, expect } from 'vitest';
import canvasReducer, {
  addShape,
  moveShape,
  resizeShape,
  deleteShape,
  selectShape,
  updateShapeText,
  CanvasState,
} from '../src/store/canvasSlice';

const initialState: CanvasState = {
  shapes: {},
  selectedShapeId: null,
  fabricCanvas: null,
  viewportCenter: { x: 2500, y: 2500 },
  zoom: 1,
};

describe('canvasSlice', () => {
  describe('addShape', () => {
    it('should add a new rectangle to the canvas', () => {
      const shapeData = {
        type: 'rectangle' as const,
        x: 100,
        y: 200,
        width: 150,
        height: 100,
        fill: '#ff0000',
        createdBy: 'user123',
      };

      const action = addShape(shapeData);
      const newState = canvasReducer(initialState, action);

      expect(Object.keys(newState.shapes)).toHaveLength(1);
      
      const addedShape = Object.values(newState.shapes)[0];
      expect(addedShape.type).toBe('rectangle');
      expect(addedShape.x).toBe(100);
      expect(addedShape.y).toBe(200);
      expect(addedShape.width).toBe(150);
      expect(addedShape.height).toBe(100);
      expect(addedShape.fill).toBe('#ff0000');
      expect(addedShape.createdBy).toBe('user123');
      expect(addedShape.id).toMatch(/^shape_\d+_[a-z0-9]+$/);
      expect(addedShape.createdAt).toBeTypeOf('number');
    });

    it('should add a new circle to the canvas', () => {
      const shapeData = {
        type: 'circle' as const,
        x: 50,
        y: 75,
        width: 100,
        height: 100,
        fill: '#00ff00',
        createdBy: 'user456',
      };

      const action = addShape(shapeData);
      const newState = canvasReducer(initialState, action);

      expect(Object.keys(newState.shapes)).toHaveLength(1);
      
      const addedShape = Object.values(newState.shapes)[0];
      expect(addedShape.type).toBe('circle');
      expect(addedShape.x).toBe(50);
      expect(addedShape.y).toBe(75);
      expect(addedShape.width).toBe(100);
      expect(addedShape.height).toBe(100);
      expect(addedShape.fill).toBe('#00ff00');
      expect(addedShape.createdBy).toBe('user456');
      expect(addedShape.id).toMatch(/^shape_\d+_[a-z0-9]+$/);
      expect(addedShape.createdAt).toBeTypeOf('number');
    });

    it('should add a new text box to the canvas', () => {
      const shapeData = {
        type: 'text' as const,
        x: 25,
        y: 50,
        width: 80,
        height: 80,
        fill: '#0000ff',
        text: 'Hello World',
        createdBy: 'user789',
      };

      const action = addShape(shapeData);
      const newState = canvasReducer(initialState, action);

      expect(Object.keys(newState.shapes)).toHaveLength(1);
      
      const addedShape = Object.values(newState.shapes)[0];
      expect(addedShape.type).toBe('text');
      expect(addedShape.x).toBe(25);
      expect(addedShape.y).toBe(50);
      expect(addedShape.width).toBe(80);
      expect(addedShape.height).toBe(80);
      expect(addedShape.fill).toBe('#0000ff');
      expect(addedShape.text).toBe('Hello World');
      expect(addedShape.createdBy).toBe('user789');
      expect(addedShape.id).toMatch(/^shape_\d+_[a-z0-9]+$/);
      expect(addedShape.createdAt).toBeTypeOf('number');
    });
  });

  describe('moveShape', () => {
    it('should update shape position', () => {
      const stateWithShape: CanvasState = {
        ...initialState,
        shapes: {
          'shape1': {
            id: 'shape1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            fill: '#ff0000',
            createdBy: 'user1',
            createdAt: Date.now(),
          },
        },
      };

      const action = moveShape({ id: 'shape1', x: 200, y: 300 });
      const newState = canvasReducer(stateWithShape, action);

      expect(newState.shapes.shape1.x).toBe(200);
      expect(newState.shapes.shape1.y).toBe(300);
    });

    it('should update lastDragged timestamp when isDragging is true', () => {
      const stateWithShape: CanvasState = {
        ...initialState,
        shapes: {
          'shape1': {
            id: 'shape1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            fill: '#ff0000',
            createdBy: 'user1',
            createdAt: Date.now(),
          },
        },
      };

      const action = moveShape({ id: 'shape1', x: 200, y: 300, isDragging: true });
      const newState = canvasReducer(stateWithShape, action);

      expect(newState.shapes.shape1.x).toBe(200);
      expect(newState.shapes.shape1.y).toBe(300);
      expect(newState.shapes.shape1.lastDragged).toBeDefined();
      expect(typeof newState.shapes.shape1.lastDragged).toBe('number');
    });

    it('should not update lastDragged when isDragging is false', () => {
      const stateWithShape: CanvasState = {
        ...initialState,
        shapes: {
          'shape1': {
            id: 'shape1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            fill: '#ff0000',
            createdBy: 'user1',
            createdAt: Date.now(),
          },
        },
      };

      const action = moveShape({ id: 'shape1', x: 200, y: 300, isDragging: false });
      const newState = canvasReducer(stateWithShape, action);

      expect(newState.shapes.shape1.x).toBe(200);
      expect(newState.shapes.shape1.y).toBe(300);
      expect(newState.shapes.shape1.lastDragged).toBeUndefined();
    });

    it('should not update non-existent shape', () => {
      const action = moveShape({ id: 'nonexistent', x: 200, y: 300 });
      const newState = canvasReducer(initialState, action);

      expect(newState).toEqual(initialState);
    });
  });

  describe('resizeShape', () => {
    it('should update shape dimensions', () => {
      const stateWithShape: CanvasState = {
        ...initialState,
        shapes: {
          'shape1': {
            id: 'shape1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            fill: '#ff0000',
            createdBy: 'user1',
            createdAt: Date.now(),
          },
        },
      };

      const action = resizeShape({ id: 'shape1', width: 100, height: 200 });
      const newState = canvasReducer(stateWithShape, action);

      expect(newState.shapes.shape1.width).toBe(100);
      expect(newState.shapes.shape1.height).toBe(200);
    });
  });

  describe('deleteShape', () => {
    it('should remove shape from canvas', () => {
      const stateWithShape: CanvasState = {
        ...initialState,
        shapes: {
          'shape1': {
            id: 'shape1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            fill: '#ff0000',
            createdBy: 'user1',
            createdAt: Date.now(),
          },
        },
      };

      const action = deleteShape('shape1');
      const newState = canvasReducer(stateWithShape, action);

      expect(newState.shapes).toEqual({});
    });

    it('should clear selection if deleted shape was selected', () => {
      const stateWithSelectedShape: CanvasState = {
        ...initialState,
        selectedShapeId: 'shape1',
        shapes: {
          'shape1': {
            id: 'shape1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            fill: '#ff0000',
            createdBy: 'user1',
            createdAt: Date.now(),
          },
        },
      };

      const action = deleteShape('shape1');
      const newState = canvasReducer(stateWithSelectedShape, action);

      expect(newState.shapes).toEqual({});
      expect(newState.selectedShapeId).toBeNull();
    });
  });

  describe('selectShape', () => {
    it('should set selected shape ID', () => {
      const action = selectShape('shape123');
      const newState = canvasReducer(initialState, action);

      expect(newState.selectedShapeId).toBe('shape123');
    });

    it('should clear selection when passing null', () => {
      const stateWithSelection: CanvasState = {
        ...initialState,
        selectedShapeId: 'shape123',
      };

      const action = selectShape(null);
      const newState = canvasReducer(stateWithSelection, action);

      expect(newState.selectedShapeId).toBeNull();
    });
  });

  describe('updateShapeText', () => {
    it('should update text content of a shape', () => {
      const stateWithTextShape: CanvasState = {
        ...initialState,
        shapes: {
          'text1': {
            id: 'text1',
            type: 'text',
            x: 100,
            y: 100,
            width: 50,
            height: 50,
            fill: '#ff0000',
            text: 'Old Text',
            createdBy: 'user1',
            createdAt: Date.now(),
          },
        },
      };

      const action = updateShapeText({ id: 'text1', text: 'New Text Content' });
      const newState = canvasReducer(stateWithTextShape, action);

      expect(newState.shapes.text1.text).toBe('New Text Content');
    });

    it('should not update non-existent shape', () => {
      const action = updateShapeText({ id: 'nonexistent', text: 'Some text' });
      const newState = canvasReducer(initialState, action);

      expect(newState).toEqual(initialState);
    });
  });
});
