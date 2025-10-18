import { CanvasObject, Rectangle, CANVAS_CONFIG, TextObject } from '../types/canvas';

/**
 * Phase 4: Sync Threshold and Echo Prevention Utilities
 * 
 * Helper functions for managing sync thresholds, echo update prevention,
 * and object change detection for the real-time synchronization system.
 */

/**
 * Check if position change exceeds sync threshold
 * @param original - Original position
 * @param current - Current position
 * @returns True if change exceeds threshold and should sync
 */
export function shouldSyncPositionChange(
  original: { x: number; y: number },
  current: { x: number; y: number }
): boolean {
  const deltaX = Math.abs(current.x - original.x);
  const deltaY = Math.abs(current.y - original.y);
  const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  return totalDelta >= CANVAS_CONFIG.MOVEMENT_THRESHOLD;
}

/**
 * Check if size change exceeds sync threshold
 * @param original - Original size
 * @param current - Current size
 * @returns True if change exceeds threshold and should sync
 */
export function shouldSyncSizeChange(
  original: { width: number; height: number },
  current: { width: number; height: number }
): boolean {
  const deltaWidth = Math.abs(current.width - original.width);
  const deltaHeight = Math.abs(current.height - original.height);
  
  return deltaWidth >= CANVAS_CONFIG.SIZE_THRESHOLD || 
         deltaHeight >= CANVAS_CONFIG.SIZE_THRESHOLD;
}

/**
 * Check if rotation change exceeds sync threshold
 * @param originalRotation - Original rotation in degrees
 * @param currentRotation - Current rotation in degrees
 * @returns True if change exceeds threshold and should sync
 */
export function shouldSyncRotationChange(
  originalRotation: number,
  currentRotation: number
): boolean {
  // Normalize angles to 0-360 range
  const normalizeAngle = (angle: number) => ((angle % 360) + 360) % 360;
  
  const normOriginal = normalizeAngle(originalRotation);
  const normCurrent = normalizeAngle(currentRotation);
  
  // Calculate shortest angle difference
  let diff = Math.abs(normCurrent - normOriginal);
  if (diff > 180) {
    diff = 360 - diff;
  }
  
  return diff >= CANVAS_CONFIG.ROTATION_THRESHOLD;
}

/**
 * Check if any object changes exceed sync thresholds
 * @param original - Original object state
 * @param current - Current object state
 * @returns True if any changes exceed thresholds
 */
export function shouldSyncObjectChanges(
  original: CanvasObject,
  current: CanvasObject
): boolean {
  // Position check
  if (shouldSyncPositionChange(
    { x: original.x, y: original.y },
    { x: current.x, y: current.y }
  )) {
    return true;
  }
  
  // Size/rotation checks for rectangles
  if (original.type === 'rectangle' && current.type === 'rectangle') {
    const originalRect = original as Rectangle;
    const currentRect = current as Rectangle;
    if (shouldSyncSizeChange(
      { width: originalRect.width, height: originalRect.height },
      { width: currentRect.width, height: currentRect.height }
    )) return true;
    if (shouldSyncRotationChange(originalRect.rotation, currentRect.rotation)) return true;
  }

  // Size/rotation checks for text (height/width from textbox; rotation on text)
  if (original.type === 'text' && current.type === 'text') {
    const o = original as TextObject;
    const c = current as TextObject;
    if (shouldSyncSizeChange(
      { width: o.width, height: o.height },
      { width: c.width, height: c.height }
    )) return true;
    if (shouldSyncRotationChange(o.rotation ?? 0, c.rotation ?? 0)) return true;
    // Text content changes should always sync
    if (o.text !== c.text) return true;
  }
  
  return false;
}

/**
 * Snap object back to original state if changes don't meet threshold
 * @param original - Original object state
 * @param current - Current object state
 * @returns Snapped object (original if below threshold, current if above)
 */
export function snapObjectToThreshold(
  original: CanvasObject,
  current: CanvasObject
): CanvasObject {
  if (shouldSyncObjectChanges(original, current)) {
    // Changes exceed threshold - return current state
    return current;
  }
  
  // Changes below threshold - snap back to original position/size/rotation
  if (original.type === 'rectangle' && current.type === 'rectangle') {
    const originalRect = original as Rectangle;
    const currentRect = current as Rectangle;
    
    return {
      ...currentRect,
      x: originalRect.x,
      y: originalRect.y,
      width: originalRect.width,
      height: originalRect.height,
      rotation: originalRect.rotation,
      // Keep other properties (zIndex, etc.) from current state
    };
  }
  
  return {
    ...current,
    x: original.x,
    y: original.y,
  };
}

/**
 * Check if an update is an echo (from the current user)
 * @param objectUpdate - Object with lastModifiedBy field
 * @param currentUserId - Current user's ID
 * @returns True if this is an echo update to ignore
 */
export function isEchoUpdate(
  objectUpdate: { lastModifiedBy: string },
  currentUserId: string
): boolean {
  return objectUpdate.lastModifiedBy === currentUserId;
}

/**
 * Filter out echo updates from an array of objects
 * @param objects - Array of objects to filter
 * @param currentUserId - Current user's ID
 * @returns Objects that are NOT echo updates
 */
export function filterEchoUpdates(
  objects: CanvasObject[],
  currentUserId: string
): CanvasObject[] {
  return objects.filter(obj => !isEchoUpdate(obj, currentUserId));
}

/**
 * Create minimal update payload with only changed fields
 * @param original - Original object state
 * @param updated - Updated object state
 * @returns Object containing only changed fields
 */
export function createUpdatePayload(
  original: CanvasObject,
  updated: CanvasObject
): Partial<CanvasObject> {
  const payload: Partial<CanvasObject> = {};
  
  // Always include ID and update metadata
  payload.id = updated.id;
  payload.updatedAt = updated.updatedAt;
  payload.lastModifiedBy = updated.lastModifiedBy;
  
  // Check each field for changes
  if (original.x !== updated.x) payload.x = updated.x;
  if (original.y !== updated.y) payload.y = updated.y;
  if (original.zIndex !== updated.zIndex) payload.zIndex = updated.zIndex;
  
  // Type-specific fields
  if (original.type === 'rectangle' && updated.type === 'rectangle') {
    const origRect = original as Rectangle;
    const updatedRect = updated as Rectangle;
    
    if (origRect.width !== updatedRect.width) (payload as any).width = updatedRect.width;
    if (origRect.height !== updatedRect.height) (payload as any).height = updatedRect.height;
    if (origRect.rotation !== updatedRect.rotation) (payload as any).rotation = updatedRect.rotation;
    if ((origRect as any).fill !== (updatedRect as any).fill) (payload as any).fill = (updatedRect as any).fill;
    if ((origRect as any).stroke !== (updatedRect as any).stroke) (payload as any).stroke = (updatedRect as any).stroke;
    if ((origRect as any).strokeWidth !== (updatedRect as any).strokeWidth) (payload as any).strokeWidth = (updatedRect as any).strokeWidth;
    if ((origRect as any).opacity !== (updatedRect as any).opacity) (payload as any).opacity = (updatedRect as any).opacity;
  }
  if (original.type === 'text' && updated.type === 'text') {
    const o = original as TextObject;
    const u = updated as TextObject;
    if (o.width !== u.width) (payload as any).width = u.width;
    if (o.height !== u.height) (payload as any).height = u.height;
    if (o.rotation !== u.rotation) (payload as any).rotation = u.rotation;
    if (o.text !== u.text) (payload as any).text = u.text;
    if (o.fontSize !== u.fontSize) (payload as any).fontSize = u.fontSize;
    if (o.maxWidth !== u.maxWidth) (payload as any).maxWidth = u.maxWidth;
    if (o.fill !== u.fill) (payload as any).fill = u.fill;
    if (o.opacity !== u.opacity) (payload as any).opacity = u.opacity;
  }
  
  return payload;
}

/**
 * Track last sync state for threshold calculations
 */
export interface SyncState {
  [objectId: string]: {
    position: { x: number; y: number };
    size: { width: number; height: number };
    rotation: number;
    lastSyncTime: number;
  };
}

/**
 * Update sync state tracking for an object
 * @param syncState - Current sync state
 * @param object - Object to update tracking for
 * @returns Updated sync state
 */
export function updateSyncStateTracking(
  syncState: SyncState,
  object: CanvasObject
): SyncState {
  const newState = { ...syncState };
  
  if (object.type === 'rectangle') {
    const rect = object as Rectangle;
    newState[object.id] = {
      position: { x: object.x, y: object.y },
      size: { width: rect.width, height: rect.height },
      rotation: rect.rotation,
      lastSyncTime: Date.now(),
    };
  } else if (object.type === 'text') {
    const t = object as TextObject;
    newState[object.id] = {
      position: { x: t.x, y: t.y },
      size: { width: t.width, height: t.height },
      rotation: t.rotation ?? 0,
      lastSyncTime: Date.now(),
    };
  } else {
    newState[object.id] = {
      position: { x: object.x, y: object.y },
      size: { width: 0, height: 0 },
      rotation: 0,
      lastSyncTime: Date.now(),
    };
  }
  
  return newState;
}

/**
 * Get last synced state for an object
 * @param syncState - Current sync state
 * @param objectId - Object ID to get state for
 * @returns Last synced state or null if not tracked
 */
export function getLastSyncedState(
  syncState: SyncState,
  objectId: string
): SyncState[string] | null {
  return syncState[objectId] || null;
}

