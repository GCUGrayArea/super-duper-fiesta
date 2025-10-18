import { CANVAS_CONFIG, CanvasObject } from '../types/canvas';
import { createRectangle, createCircle, createText } from '../utils/canvasObjects';
import { arrangeHorizontal, arrangeVertical, arrangeGrid, distributeEvenly } from '../utils/arrangement';
import { 
  addObjectToCanvas,
  updateObjectInCanvas,
  deleteObjectFromCanvas,
  loadCanvas,
  updateCanvasObjects
} from '../firebase/canvasSync';
import { logAICommand, getLastNCommands } from './history';
import { debugLog, debugError } from '../utils/debug';

// Basic result types for AI wrappers
export interface AiResult {
  success: boolean;
  error?: string;
}

export interface AiCreateResult extends AiResult {
  objectId?: string;
}

const DEFAULT_CANVAS_ID = 'main';
const AI_USER_ID = 'ai-agent';
// Logging is routed via debugLog('aiTools', ...)

function withinBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x <= CANVAS_CONFIG.WORLD_WIDTH && y <= CANVAS_CONFIG.WORLD_HEIGHT;
}

function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function pickByIds(objects: CanvasObject[], ids: string[]): CanvasObject[] {
  const map = new Map(objects.map(o => [o.id, o] as const));
  return ids.map(id => map.get(id)).filter((o): o is CanvasObject => !!o);
}

export async function aiCreateRectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  canvasId: string = DEFAULT_CANVAS_ID,
  rotation?: number
): Promise<AiCreateResult> {
  try {
    debugLog('aiTools', 'createRectangle', { canvasId, x, y, width, height, fill });
    if (!withinBounds(x, y)) return { success: false, error: 'Position outside canvas bounds' };
    if (!positive(width) || !positive(height)) return { success: false, error: 'Width and height must be positive' };

    const canvas = await loadCanvas(canvasId);
    const existing = canvas?.objects || [];
    const rect = createRectangle(x, y, AI_USER_ID, existing);
    rect.width = width;
    rect.height = height;
    rect.fill = fill || rect.fill;
    if (typeof rotation === 'number') {
      rect.rotation = rotation;
    }
    await addObjectToCanvas(canvasId, rect, existing);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'createRectangle', parameters: { x, y, width, height, fill }, objectsCreated: [rect.id], status: 'success' });
    return { success: true, objectId: rect.id };
  } catch (err: any) {
    debugError('aiTools', 'createRectangle failed', err);
    return { success: false, error: err?.message || 'Failed to create rectangle' };
  }
}

export async function aiCreateCircle(
  x: number,
  y: number,
  radius: number,
  fill: string,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<AiCreateResult> {
  try {
    debugLog('aiTools', 'createCircle', { canvasId, x, y, radius, fill });
    if (!withinBounds(x, y)) return { success: false, error: 'Position outside canvas bounds' };
    if (!positive(radius)) return { success: false, error: 'Radius must be positive' };

    const canvas = await loadCanvas(canvasId);
    const existing = canvas?.objects || [];
    const diameter = radius * 2;
    const circle = createCircle(x, y, AI_USER_ID, existing, { width: diameter, height: diameter, fill });
    await addObjectToCanvas(canvasId, circle, existing);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'createCircle', parameters: { x, y, radius, fill }, objectsCreated: [circle.id], status: 'success' });
    return { success: true, objectId: circle.id };
  } catch (err: any) {
    debugError('aiTools', 'createCircle failed', err);
    return { success: false, error: err?.message || 'Failed to create circle' };
  }
}

export async function aiCreateEllipse(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<AiCreateResult> {
  try {
    debugLog('aiTools', 'createEllipse', { canvasId, x, y, width, height, fill });
    if (!withinBounds(x, y)) return { success: false, error: 'Position outside canvas bounds' };
    if (!positive(width) || !positive(height)) return { success: false, error: 'Width and height must be positive' };

    const canvas = await loadCanvas(canvasId);
    const existing = canvas?.objects || [];
    const circle = createCircle(x, y, AI_USER_ID, existing, { width, height, fill });
    await addObjectToCanvas(canvasId, circle, existing);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'createCircle', parameters: { x, y, width, height, fill }, objectsCreated: [circle.id], status: 'success' });
    return { success: true, objectId: circle.id };
  } catch (err: any) {
    debugError('aiTools', 'createEllipse failed', err);
    return { success: false, error: err?.message || 'Failed to create ellipse' };
  }
}

export async function aiCreateText(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<AiCreateResult> {
  try {
    debugLog('aiTools', 'createText', { canvasId, text, x, y, fontSize, fill });
    if (!withinBounds(x, y)) return { success: false, error: 'Position outside canvas bounds' };
    if (!positive(fontSize)) return { success: false, error: 'fontSize must be positive' };

    const canvas = await loadCanvas(canvasId);
    const existing = canvas?.objects || [];
    const t = createText(text, x, y, AI_USER_ID, existing, { fontSize, fill });
    await addObjectToCanvas(canvasId, t, existing);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'createText', parameters: { text, x, y, fontSize, fill }, objectsCreated: [t.id], status: 'success' });
    return { success: true, objectId: t.id };
  } catch (err: any) {
    debugError('aiTools', 'createText failed', err);
    return { success: false, error: err?.message || 'Failed to create text' };
  }
}

export async function aiMoveObject(
  objectId: string,
  x: number,
  y: number,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<AiResult> {
  try {
    debugLog('aiTools', 'moveObject', { canvasId, objectId, x, y });
    if (!withinBounds(x, y)) return { success: false, error: 'Position outside canvas bounds' };
    const canvas = await loadCanvas(canvasId);
    const objects = canvas?.objects || [];
    const prev = pickByIds(objects, [objectId]).map(o => ({ id: o.id, state: o }));
    await updateObjectInCanvas(canvasId, objectId, { x, y } as Partial<CanvasObject>, AI_USER_ID, objects);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'moveObject', parameters: { objectId, x, y }, objectsModified: [objectId], previousStates: prev, status: 'success' });
    return { success: true };
  } catch (err: any) {
    debugError('aiTools', 'moveObject failed', err);
    return { success: false, error: err?.message || 'Failed to move object' };
  }
}

export async function aiResizeObject(
  objectId: string,
  width: number,
  height: number,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<AiResult> {
  try {
    debugLog('aiTools', 'resizeObject', { canvasId, objectId, width, height });
    if (!positive(width) || !positive(height)) return { success: false, error: 'Width and height must be positive' };
    if (width < CANVAS_CONFIG.MIN_GEOMETRY_SIZE || height < CANVAS_CONFIG.MIN_GEOMETRY_SIZE) {
      return { success: false, error: `Width and height must be at least ${CANVAS_CONFIG.MIN_GEOMETRY_SIZE}` };
    }
    const canvas = await loadCanvas(canvasId);
    const objects = canvas?.objects || [];
    const current = pickByIds(objects, [objectId])[0];
    if (!current) return { success: false, error: 'Object not found' };
    // Bounds validation against world
    const fitsWithinWorld = current.x >= 0 && current.y >= 0 &&
      current.x + width <= CANVAS_CONFIG.WORLD_WIDTH &&
      current.y + height <= CANVAS_CONFIG.WORLD_HEIGHT;
    if (!fitsWithinWorld) {
      return { success: false, error: 'Resize would place object outside canvas bounds' };
    }
    const prev = pickByIds(objects, [objectId]).map(o => ({ id: o.id, state: o }));
    await updateObjectInCanvas(canvasId, objectId, { width, height } as Partial<CanvasObject>, AI_USER_ID, objects);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'resizeObject', parameters: { objectId, width, height }, objectsModified: [objectId], previousStates: prev, status: 'success' });
    return { success: true };
  } catch (err: any) {
    debugError('aiTools', 'resizeObject failed', err);
    return { success: false, error: err?.message || 'Failed to resize object' };
  }
}

export async function aiResizeCircle(
  objectId: string,
  radius: number,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<AiResult> {
  try {
    debugLog('aiTools', 'resizeCircle', { canvasId, objectId, radius });
    if (!positive(radius)) return { success: false, error: 'Radius must be positive' };
    const diameter = radius * 2;
    if (diameter < CANVAS_CONFIG.MIN_GEOMETRY_SIZE) {
      return { success: false, error: `Diameter must be at least ${CANVAS_CONFIG.MIN_GEOMETRY_SIZE}` };
    }
    const canvas = await loadCanvas(canvasId);
    const objects = canvas?.objects || [];
    const current = pickByIds(objects, [objectId])[0];
    if (!current) return { success: false, error: 'Object not found' };
    const fitsWithinWorld = current.x >= 0 && current.y >= 0 &&
      current.x + diameter <= CANVAS_CONFIG.WORLD_WIDTH &&
      current.y + diameter <= CANVAS_CONFIG.WORLD_HEIGHT;
    if (!fitsWithinWorld) return { success: false, error: 'Resize would place object outside canvas bounds' };
    const prev = [{ id: current.id, state: current }];
    await updateObjectInCanvas(canvasId, objectId, { width: diameter, height: diameter } as Partial<CanvasObject>, AI_USER_ID, objects);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'resizeObject', parameters: { objectId, radius }, objectsModified: [objectId], previousStates: prev, status: 'success' });
    return { success: true };
  } catch (err: any) {
    debugError('aiTools', 'resizeCircle failed', err);
    return { success: false, error: err?.message || 'Failed to resize circle' };
  }
}

export async function aiResizeText(
  objectId: string,
  fontSize: number,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<AiResult> {
  try {
    debugLog('aiTools', 'resizeText', { canvasId, objectId, fontSize });
    if (!positive(fontSize)) return { success: false, error: 'fontSize must be positive' };
    const canvas = await loadCanvas(canvasId);
    const objects = canvas?.objects || [];
    const current = pickByIds(objects, [objectId])[0] as any;
    if (!current) return { success: false, error: 'Object not found' };
    const oldFontSize = Number(current.fontSize ?? CANVAS_CONFIG.DEFAULT_TEXT_FONT_SIZE) || CANVAS_CONFIG.DEFAULT_TEXT_FONT_SIZE;
    const factor = fontSize / oldFontSize;
    const oldW = Number(current.width ?? CANVAS_CONFIG.MIN_GEOMETRY_SIZE) || CANVAS_CONFIG.MIN_GEOMETRY_SIZE;
    const oldH = Number(current.height ?? Math.max(1, Math.round(oldFontSize * 1.2)));
    const newW = Math.max(CANVAS_CONFIG.MIN_GEOMETRY_SIZE, Math.round(oldW * factor));
    const newH = Math.max(1, Math.round(oldH * factor));
    const fitsWithinWorld = current.x >= 0 && current.y >= 0 &&
      current.x + newW <= CANVAS_CONFIG.WORLD_WIDTH &&
      current.y + newH <= CANVAS_CONFIG.WORLD_HEIGHT;
    if (!fitsWithinWorld) return { success: false, error: 'Resize would place object outside canvas bounds' };
    const prev = [{ id: current.id, state: current }];
    await updateObjectInCanvas(canvasId, objectId, { fontSize, width: newW, height: newH } as Partial<CanvasObject>, AI_USER_ID, objects);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'resizeObject', parameters: { objectId, fontSize }, objectsModified: [objectId], previousStates: prev, status: 'success' });
    return { success: true };
  } catch (err: any) {
    debugError('aiTools', 'resizeText failed', err);
    return { success: false, error: err?.message || 'Failed to resize text' };
  }
}

export async function aiRotateObject(
  objectId: string,
  degrees: number,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<AiResult> {
  try {
    debugLog('aiTools', 'rotateObject', { canvasId, objectId, degrees });
    const rotation = ((degrees % 360) + 360) % 360;
    const canvas = await loadCanvas(canvasId);
    const objects = canvas?.objects || [];
    const prev = pickByIds(objects, [objectId]).map(o => ({ id: o.id, state: o }));
    await updateObjectInCanvas(canvasId, objectId, { rotation } as Partial<CanvasObject>, AI_USER_ID, objects);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'rotateObject', parameters: { objectId, degrees: rotation }, objectsModified: [objectId], previousStates: prev, status: 'success' });
    return { success: true };
  } catch (err: any) {
    debugError('aiTools', 'rotateObject failed', err);
    return { success: false, error: err?.message || 'Failed to rotate object' };
  }
}

export async function aiDeleteObject(
  objectId: string,
  canvasId: string = DEFAULT_CANVAS_ID
): Promise<AiResult> {
  try {
    debugLog('aiTools', 'deleteObject', { canvasId, objectId });
    const canvas = await loadCanvas(canvasId);
    const objects = canvas?.objects || [];
    const prev = pickByIds(objects, [objectId]).map(o => ({ id: o.id, state: o }));
    await deleteObjectFromCanvas(canvasId, objectId, AI_USER_ID, objects);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'deleteObject', parameters: { objectId }, objectsDeleted: [objectId], previousStates: prev, status: 'success' });
    return { success: true };
  } catch (err: any) {
    debugError('aiTools', 'deleteObject failed', err);
    return { success: false, error: err?.message || 'Failed to delete object' };
  }
}

// Layout wrappers operate by reading the canvas, computing new positions, then batch writing
export async function aiArrangeHorizontal(objectIds: string[], spacing = 16, canvasId: string = DEFAULT_CANVAS_ID, options?: { onlyCreatedInLastCommand?: boolean }): Promise<AiResult> {
  try {
    const canvas = await loadCanvas(canvasId);
    const objects = canvas?.objects || [];
    let ids = objectIds;
    if (options?.onlyCreatedInLastCommand) {
      const last = await getLastNCommands(canvasId, 1);
      const created = (last[0]?.objectsCreated || []) as string[];
      if (created.length > 0) ids = ids.filter(id => created.includes(id));
    }
    const prev = pickByIds(objects, ids).map(o => ({ id: o.id, state: o }));
    const updated = arrangeHorizontal(objects, ids, spacing);
    await updateCanvasObjects(canvasId, updated, AI_USER_ID);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'arrangeHorizontal', parameters: { objectIds: ids, spacing }, objectsModified: ids, previousStates: prev, status: 'success' });
    return { success: true };
  } catch (err: any) { return { success: false, error: err?.message || 'Arrange horizontal failed' }; }
}

export async function aiArrangeVertical(objectIds: string[], spacing = 16, canvasId: string = DEFAULT_CANVAS_ID, options?: { onlyCreatedInLastCommand?: boolean }): Promise<AiResult> {
  try {
    const canvas = await loadCanvas(canvasId);
    const objects = canvas?.objects || [];
    let ids = objectIds;
    if (options?.onlyCreatedInLastCommand) {
      const last = await getLastNCommands(canvasId, 1);
      const created = (last[0]?.objectsCreated || []) as string[];
      if (created.length > 0) ids = ids.filter(id => created.includes(id));
    }
    const prev = pickByIds(objects, ids).map(o => ({ id: o.id, state: o }));
    const updated = arrangeVertical(objects, ids, spacing);
    await updateCanvasObjects(canvasId, updated, AI_USER_ID);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'arrangeVertical', parameters: { objectIds: ids, spacing }, objectsModified: ids, previousStates: prev, status: 'success' });
    return { success: true };
  } catch (err: any) { return { success: false, error: err?.message || 'Arrange vertical failed' }; }
}

export async function aiArrangeGrid(objectIds: string[], cols?: number, spacing = 16, canvasId: string = DEFAULT_CANVAS_ID, options?: { onlyCreatedInLastCommand?: boolean }): Promise<AiResult> {
  try {
    const canvas = await loadCanvas(canvasId);
    const objects = canvas?.objects || [];
    let ids = objectIds;
    if (options?.onlyCreatedInLastCommand) {
      const last = await getLastNCommands(canvasId, 1);
      const created = (last[0]?.objectsCreated || []) as string[];
      if (created.length > 0) ids = ids.filter(id => created.includes(id));
    }
    const prev = pickByIds(objects, ids).map(o => ({ id: o.id, state: o }));
    const updated = arrangeGrid(objects, ids, { spacing, columns: cols, viewportWidth: CANVAS_CONFIG.VIEWPORT_WIDTH });
    await updateCanvasObjects(canvasId, updated, AI_USER_ID);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'arrangeGrid', parameters: { objectIds: ids, cols, spacing }, objectsModified: ids, previousStates: prev, status: 'success' });
    return { success: true };
  } catch (err: any) { return { success: false, error: err?.message || 'Arrange grid failed' }; }
}

export async function aiDistributeEvenly(objectIds: string[], axis: 'horizontal' | 'vertical', canvasId: string = DEFAULT_CANVAS_ID, options?: { onlyCreatedInLastCommand?: boolean }): Promise<AiResult> {
  try {
    const canvas = await loadCanvas(canvasId);
    const objects = canvas?.objects || [];
    let ids = objectIds;
    if (options?.onlyCreatedInLastCommand) {
      const last = await getLastNCommands(canvasId, 1);
      const created = (last[0]?.objectsCreated || []) as string[];
      if (created.length > 0) ids = ids.filter(id => created.includes(id));
    }
    const prev = pickByIds(objects, ids).map(o => ({ id: o.id, state: o }));
    const updated = distributeEvenly(objects, ids, axis);
    await updateCanvasObjects(canvasId, updated, AI_USER_ID);
    await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'distributeEvenly', parameters: { objectIds: ids, axis }, objectsModified: ids, previousStates: prev, status: 'success' });
    return { success: true };
  } catch (err: any) { return { success: false, error: err?.message || 'Distribute failed' }; }
}

// Query wrappers
export async function aiGetCanvasState(canvasId: string = DEFAULT_CANVAS_ID): Promise<CanvasObject[]> {
  const canvas = await loadCanvas(canvasId);
  return canvas?.objects || [];
}

export function aiGetViewportCenter(): { x: number; y: number } {
  return { x: CANVAS_CONFIG.DEFAULT_VIEWPORT_X, y: CANVAS_CONFIG.DEFAULT_VIEWPORT_Y };
}

export async function aiGetObjectsByDescription(description: string, canvasId: string = DEFAULT_CANVAS_ID): Promise<string[]> {
  const objects = await aiGetCanvasState(canvasId);
  const d = description.toLowerCase();
  const wantsRect = d.includes('rectangle') || d.includes('rect') || d.includes('square') || d.includes('squares');
  const wantsCircle = d.includes('circle') || d.includes('circles') || d.includes('ellipse') || d.includes('round');
  const wantsText = d.includes('text') || d.includes('texts') || d.includes('label') || d.includes('labels');

  const colorWords = ['red','blue','green','purple','black','white','brown','orange','pink','yellow','cyan','teal','grey','gray','magenta','lime','chartreuse','sienna','chocolate','peru','tan','burlywood','sandybrown','rosybrown'];
  const colorRegex = new RegExp(`\\b(${colorWords.join('|')})\\b`);
  const wantsAnyColor = !d.match(colorRegex);

  const parseColorCategory = (fill: string): string => {
    const f = fill.toLowerCase().trim();
    const nameMap: Record<string, string> = {
      red: 'red', blue: 'blue', green: 'green', purple: 'purple', black: 'black', white: 'white',
      maroon: 'red', crimson: 'red', cyan: 'cyan', navy: 'blue', lime: 'lime', violet: 'purple', gray: 'grey', grey: 'grey',
      brown: 'brown', orange: 'orange', pink: 'pink', yellow: 'yellow', magenta: 'magenta', teal: 'teal',
      sienna: 'brown', chocolate: 'brown', peru: 'brown', tan: 'brown', burlywood: 'brown', sandybrown: 'brown', rosybrown: 'brown',
      chartreuse: 'lime'
    };
    if (nameMap[f]) return nameMap[f];
    const hex = f.match(/^#([0-9a-f]{6})$/i);
    const rgb = f.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    let r = -1, g = -1, b = -1;
    if (hex) {
      const v = hex[1];
      r = parseInt(v.slice(0,2),16); g = parseInt(v.slice(2,4),16); b = parseInt(v.slice(4,6),16);
    } else if (rgb) {
      r = Number(rgb[1]); g = Number(rgb[2]); b = Number(rgb[3]);
    }
    if (r >= 0) {
      const max = Math.max(r,g,b);
      if (max === 0) return 'black';
      const sum = r+g+b;
      if (sum > 720) return 'white'; // very bright approx
      if (max === r && r > g+10 && r > b+10) return 'red';
      if (max === g && g >= r && g >= b) return 'green';
      if (max === b && b >= r && b >= g) return 'blue';
      // crude purple detection: red ~ blue
      if (Math.abs(r-b) < 30 && r > g && b > g) return 'purple';
      return 'other';
    }
    return 'other';
  };

  const colorMatch = (fill: any) => {
    if (!fill || typeof fill !== 'string') return wantsAnyColor;
    const cat = parseColorCategory(fill);
    for (const w of colorWords) {
      if (new RegExp(`\\b${w}\\b`).test(d) && cat === w) return true;
      // Map greys to black-ish
      if ((w === 'grey' || w === 'gray') && /\b(grey|gray)\b/.test(d) && (cat === 'grey' || cat === 'black')) return true;
      if (w === 'lime' && /\blime\b/.test(d) && (cat === 'lime' || cat === 'green')) return true;
      if (w === 'chartreuse' && /\bchartreuse\b/.test(d) && (cat === 'green' || cat === 'lime')) return true;
      if (w === 'magenta' && /\bmagenta\b/.test(d) && (cat === 'magenta' || cat === 'purple')) return true;
      if (w === 'cyan' && /\bcyan\b/.test(d) && (cat === 'cyan' || cat === 'blue')) return true;
    }
    return wantsAnyColor;
  };

  return objects
    .filter(o => (
      (wantsRect && o.type === 'rectangle') ||
      (wantsCircle && o.type === 'circle') ||
      (wantsText && o.type === 'text') ||
      (!wantsRect && !wantsCircle && !wantsText) // if no type specified, allow all
    ))
    .filter(o => colorMatch((o as any).fill))
    .map(o => o.id);
}

export async function aiGetCommandHistory(canvasId: string = DEFAULT_CANVAS_ID, n: number = 20) {
  return await getLastNCommands(canvasId, n);
}

