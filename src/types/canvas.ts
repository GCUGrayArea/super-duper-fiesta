// Canvas object types and interfaces

// Base interface for all canvas objects
export interface BaseCanvasObject {
  id: string; // Unique identifier (UUID)
  type: string; // Object type discriminator
  x: number; // Position X coordinate
  y: number; // Position Y coordinate  
  zIndex: number; // Layer ordering
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

// Rectangle object interface
export interface Rectangle extends BaseCanvasObject {
  type: 'rectangle';
  width: number; // Default: 150
  height: number; // Default: 150
  fill: string; // Color from predefined palette
  stroke: string; // Default: "black"
  strokeWidth: number; // Default: 1
  opacity: number; // Default: 1.0 (100%)
  rotation: number; // Rotation angle in degrees (default: 0)
}

// Union type for all canvas objects (extensible for future shapes)
export type CanvasObject = Rectangle;

// Viewport state interface
export interface Viewport {
  x: number; // Viewport center X (default: 2500)
  y: number; // Viewport center Y (default: 2500)
  zoom: number; // Zoom level (1.0 = 100%, min: 0.1, max: 4.0)
}

// Selection state interface
export interface Selection {
  selectedObjectId: string | null; // Currently selected object ID
}

// Canvas dimensions and constraints
export const CANVAS_CONFIG = {
  WORLD_WIDTH: 5000, // Total canvas world width
  WORLD_HEIGHT: 5000, // Total canvas world height
  VIEWPORT_WIDTH: 800, // Default viewport width
  VIEWPORT_HEIGHT: 600, // Default viewport height
  MIN_ZOOM: 0.25, // 25% minimum zoom
  MAX_ZOOM: 3.0, // 300% maximum zoom
  DEFAULT_VIEWPORT_X: 2500, // Center of world
  DEFAULT_VIEWPORT_Y: 2500, // Center of world
  MOVEMENT_THRESHOLD: 5, // 5px threshold for sync (Phase 4)
  DEFAULT_RECTANGLE_WIDTH: 150,
  DEFAULT_RECTANGLE_HEIGHT: 150,
} as const;

// Type guards for canvas objects
export function isRectangle(obj: CanvasObject): obj is Rectangle {
  return obj.type === 'rectangle';
}

// Utility type for object creation (without computed fields)
export type CreateRectangleData = Omit<Rectangle, 'id' | 'createdAt' | 'updatedAt' | 'zIndex'>;
