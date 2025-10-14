import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CanvasShape {
  id: string;
  type: 'rectangle' | 'circle' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  createdBy: string;
  createdAt: number;
  lastDragged?: number; // Timestamp of when shape was last moved/dragged
  text?: string; // Text content for text shapes
}

export interface CanvasState {
  shapes: { [shapeId: string]: CanvasShape };
  selectedShapeId: string | null;
  fabricCanvas: any; // Will hold Fabric Canvas instance
  viewportCenter: { x: number; y: number };
  zoom: number;
}

const initialState: CanvasState = {
  shapes: {},
  selectedShapeId: null,
  fabricCanvas: null,
  viewportCenter: { x: 2500, y: 2500 }, // Center of 5000x5000 canvas
  zoom: 1,
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // Set Fabric canvas instance
    setFabricCanvas: (state, action: PayloadAction<any>) => {
      state.fabricCanvas = action.payload;
    },

    // Add new shape
    addShape: (state, action: PayloadAction<Omit<CanvasShape, 'id' | 'createdAt'>>) => {
      const shapeId = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const shape: CanvasShape = {
        ...action.payload,
        id: shapeId,
        createdAt: Date.now(),
      };
      state.shapes[shapeId] = shape;
    },

    // Move shape
    moveShape: (state, action: PayloadAction<{ id: string; x: number; y: number; isDragging?: boolean }>) => {
      const { id, x, y, isDragging } = action.payload;
      if (state.shapes[id]) {
        state.shapes[id].x = x;
        state.shapes[id].y = y;
        // Update lastDragged timestamp when actively dragging
        if (isDragging) {
          state.shapes[id].lastDragged = Date.now();
        }
      }
    },

    // Resize shape
    resizeShape: (state, action: PayloadAction<{ id: string; width: number; height: number }>) => {
      const { id, width, height } = action.payload;
      if (state.shapes[id]) {
        state.shapes[id].width = width;
        state.shapes[id].height = height;
      }
    },

    // Delete shape
    deleteShape: (state, action: PayloadAction<string>) => {
      delete state.shapes[action.payload];
      if (state.selectedShapeId === action.payload) {
        state.selectedShapeId = null;
      }
    },

    // Select shape
    selectShape: (state, action: PayloadAction<string | null>) => {
      state.selectedShapeId = action.payload;
    },

    // Update viewport center
    updateViewportCenter: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.viewportCenter = action.payload;
    },

    // Update zoom level
    updateZoom: (state, action: PayloadAction<number>) => {
      state.zoom = action.payload;
    },

    // Update shape text content
    updateShapeText: (state, action: PayloadAction<{ id: string; text: string }>) => {
      const { id, text } = action.payload;
      if (state.shapes[id]) {
        state.shapes[id].text = text;
      }
    },
  },
});

export const {
  setFabricCanvas,
  addShape,
  moveShape,
  resizeShape,
  deleteShape,
  selectShape,
  updateViewportCenter,
  updateZoom,
  updateShapeText,
} = canvasSlice.actions;

export default canvasSlice.reducer;
