import { Rectangle, CanvasObject, CANVAS_CONFIG } from '../types/canvas';
import { COLOR_PALETTE } from './colorHash';

/**
 * Generate a unique ID for canvas objects using crypto.randomUUID()
 */
export function generateObjectId(): string {
  return crypto.randomUUID();
}

/**
 * Get random color from the palette for new rectangles
 */
export function getRandomRectangleColor(): string {
  const randomIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
  return COLOR_PALETTE[randomIndex];
}

/**
 * Calculate the next z-index for a new object
 * @param existingObjects - Array of existing canvas objects
 * @returns Next z-index (max + 1, or 1 if no objects)
 */
export function calculateNextZIndex(existingObjects: CanvasObject[]): number {
  if (existingObjects.length === 0) {
    return 1;
  }
  
  const maxZIndex = Math.max(...existingObjects.map(obj => obj.zIndex));
  return maxZIndex + 1;
}

/**
 * Create a new rectangle with default properties
 * @param x - X position
 * @param y - Y position 
 * @param existingObjects - Existing objects for z-index calculation
 * @returns New Rectangle object
 */
export function createRectangle(
  x: number, 
  y: number, 
  existingObjects: CanvasObject[] = []
): Rectangle {
  const now = Date.now();
  
  return {
    id: generateObjectId(),
    type: 'rectangle',
    x,
    y,
    width: CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH,
    height: CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT,
    fill: getRandomRectangleColor(),
    stroke: 'black',
    strokeWidth: 1,
    opacity: 1.0,
    rotation: 0, // Default: no rotation
    zIndex: calculateNextZIndex(existingObjects),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Calculate viewport center coordinates based on current viewport state
 * @param viewport - Current viewport state (x, y, zoom)
 * @param _viewportWidth - Viewport width in pixels (unused, for future extensibility)
 * @param _viewportHeight - Viewport height in pixels (unused, for future extensibility)
 * @returns World coordinates at viewport center
 */
export function calculateViewportCenter(
  viewport: { x: number; y: number; zoom: number },
  _viewportWidth: number,
  _viewportHeight: number
): { x: number; y: number } {
  // In Fabric.js, the viewport coordinates represent the center point
  // So we can directly use the viewport x,y as the center
  return {
    x: viewport.x,
    y: viewport.y
  };
}

/**
 * Check if two rectangles overlap
 * @param rect1 - First rectangle
 * @param rect2 - Second rectangle
 * @returns True if rectangles overlap
 */
export function checkRectangleOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
  // Check if rectangles do NOT overlap, then return the opposite
  const noOverlap = (
    rect1.x + rect1.width < rect2.x ||  // rect1 is to the left of rect2
    rect2.x + rect2.width < rect1.x ||  // rect2 is to the left of rect1
    rect1.y + rect1.height < rect2.y || // rect1 is above rect2
    rect2.y + rect2.height < rect1.y    // rect2 is above rect1
  );
  
  return !noOverlap;
}

/**
 * Find overlapping objects with a new rectangle
 * @param newRect - Rectangle to check
 * @param existingObjects - Array of existing objects
 * @returns Array of overlapping objects
 */
export function findOverlappingObjects(
  newRect: Rectangle, 
  existingObjects: CanvasObject[]
): Rectangle[] {
  return existingObjects
    .filter((obj): obj is Rectangle => obj.type === 'rectangle')
    .filter(rect => rect.id !== newRect.id && checkRectangleOverlap(newRect, rect));
}

/**
 * Sort objects by z-index for proper rendering order
 * @param objects - Array of canvas objects
 * @returns Sorted array (lowest z-index first)
 */
export function sortObjectsByZIndex(objects: CanvasObject[]): CanvasObject[] {
  return [...objects].sort((a, b) => a.zIndex - b.zIndex);
}

/**
 * Find the topmost object at given coordinates (for selection)
 * @param x - World X coordinate
 * @param y - World Y coordinate
 * @param objects - Array of canvas objects
 * @returns Topmost object at coordinates, or null if none
 */
export function findTopmostObjectAt(
  x: number, 
  y: number, 
  objects: CanvasObject[]
): CanvasObject | null {
  // Filter objects that contain the point, then get the one with highest z-index
  const objectsAtPoint = objects
    .filter((obj): obj is Rectangle => obj.type === 'rectangle')
    .filter(rect => 
      x >= rect.x && 
      x <= rect.x + rect.width && 
      y >= rect.y && 
      y <= rect.y + rect.height
    );
  
  if (objectsAtPoint.length === 0) {
    return null;
  }
  
  // Return object with highest z-index
  return objectsAtPoint.reduce((topmost, current) => 
    current.zIndex > topmost.zIndex ? current : topmost
  );
}
