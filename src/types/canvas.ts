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
  lastModifiedBy: string; // User ID who last modified this object (for echo prevention)
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

// Circle/Ellipse object interface (rotation out of scope for MVP)
export interface Circle extends BaseCanvasObject {
  type: 'circle';
  width: number; // Bounding box width (ellipse support)
  height: number; // Bounding box height (ellipse support)
  fill: string;
  stroke: string; // Default: "black"
  strokeWidth: number; // Default: 1
  opacity: number; // Default: 1.0 (100%)
}

// Text object interface (basic fields for MVP)
export interface TextObject extends BaseCanvasObject {
  type: 'text';
  text: string;
  width: number; // Approximated bounding width for validation/layout
  height: number; // Approximated bounding height for validation/layout
  fontSize: number; // Default: 14 (px)
  maxWidth: number; // Default: 500
  fill: string; // Text color
  opacity: number; // Default: 1.0 (100%)
  rotation: number; // Rotation angle in degrees (default: 0)
}

// Union type for all canvas objects (extensible for future shapes)
export type CanvasObject = Rectangle | Circle | TextObject;

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
  SIZE_THRESHOLD: 5, // 5px threshold for size changes (Phase 4)
  ROTATION_THRESHOLD: 5, // 5 degree threshold for rotation changes (Phase 4)
  DEFAULT_RECTANGLE_WIDTH: 150,
  DEFAULT_RECTANGLE_HEIGHT: 150,
  // Shape limits
  MIN_GEOMETRY_SIZE: 20, // Min width/height for rectangle and circle
  DEFAULT_CIRCLE_DIAMETER: 120, // Used when not specified
  DEFAULT_TEXT_FONT_SIZE: 14, // px
  DEFAULT_TEXT_MAX_WIDTH: 500, // px
} as const;

// Type guards for canvas objects
export function isRectangle(obj: CanvasObject): obj is Rectangle {
  return obj.type === 'rectangle';
}

export function isCircle(obj: CanvasObject): obj is Circle {
  return obj.type === 'circle';
}

export function isTextObject(obj: CanvasObject): obj is TextObject {
  return obj.type === 'text';
}

// Firestore canvas document structure for Phase 4 sync
export interface CanvasDocument {
  id: string; // Canvas ID (e.g., "main")
  objects: CanvasObject[]; // Array of all canvas objects
  lastUpdated: number; // Timestamp of last update
  createdBy: string; // User ID who created the canvas
  createdAt: number; // Canvas creation timestamp
}

// Object locking for Phase 5 multiplayer (preparation)
export interface ObjectLock {
  objectId: string; // ID of locked object
  userId: string; // ID of user who locked it
  displayName: string; // Display name of user who locked it
  timestamp: number; // When the lock was acquired
}

// Utility type for object creation (without computed fields)
export type CreateRectangleData = Omit<Rectangle, 'id' | 'createdAt' | 'updatedAt' | 'zIndex' | 'lastModifiedBy'>;

export type CreateCircleData = Omit<Circle, 'id' | 'createdAt' | 'updatedAt' | 'zIndex' | 'lastModifiedBy'>;

export type CreateTextData = Omit<TextObject, 'id' | 'createdAt' | 'updatedAt' | 'zIndex' | 'lastModifiedBy'>;
