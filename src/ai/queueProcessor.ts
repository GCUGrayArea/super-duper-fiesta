import { collection, addDoc, limit, onSnapshot, orderBy, query, updateDoc, doc, where, deleteDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { aiArrangeGrid, aiArrangeHorizontal, aiArrangeVertical, aiCreateCircle, aiCreateEllipse, aiCreateRectangle, aiCreateText, aiDistributeEvenly, aiGetObjectsByDescription, aiDeleteObject, aiRotateObject, aiResizeObject, aiGetCanvasState, aiMoveObject, aiGetViewportCenter } from './aiTools';
import { CANVAS_CONFIG } from '../types/canvas';
import { store } from '../store';
import { debugLog, debugError } from '../utils/debug';
import { undoLastCommand, undoLastNCommands } from './history';
import { chatComplete } from './openaiClient';

// Logging is routed via debugLog('queue', ...)

// In-memory recent message context (keep last 20 lines of user/AI text)
const lastMessages: string[] = [];
function rememberMessage(text: string) {
  if (!text) return;
  lastMessages.push(text);
  if (lastMessages.length > 20) lastMessages.shift();
}

export async function enqueueCommand(canvasId: string, userId: string, displayName: string, command: string): Promise<string> {
  const ref = collection(db, `commandQueue/${canvasId}/commands`);
  const docRef = await addDoc(ref, { canvasId, userId, displayName, command, status: 'queued', timestamp: Date.now() });
  debugLog('queue', 'enqueued', { id: docRef.id, command });
  return docRef.id;
}

async function setStatus(canvasId: string, id: string, status: 'executing' | 'complete' | 'failed', errorMessage?: string) {
  const ref = doc(db, `commandQueue/${canvasId}/commands`, id);
  const payload: any = { status };
  if (status === 'failed' && errorMessage) {
    payload.errorMessage = errorMessage;
  } else {
    // Remove errorMessage on non-failed updates
    payload.errorMessage = deleteField();
  }
  await updateDoc(ref, payload);
}

async function postAIMessage(canvasId: string, message: string) {
  const chatRef = collection(db, `chats/${canvasId}/messages`);
  await addDoc(chatRef, {
    canvasId,
    userId: 'ai-agent',
    displayName: 'AI Assistant',
    message,
    isAI: true,
    timestamp: Date.now(),
  });
  rememberMessage(message);
}

// LLM-based normalization of user commands into structured actions
type NormalizedClarify = { action: 'clarify'; question: string; missing?: string[] };
type NormalizedAction = { action: string; parameters: any };

// Last-selection memory (very small, in-process)
let lastSelectedIds: string[] = [];
function rememberSelection(ids: string[]) { if (Array.isArray(ids) && ids.length > 0) lastSelectedIds = ids.slice(0, 5); }
function resolvePronouns(text: string, candidateIds: string[]): string[] {
  const t = (text || '').toLowerCase();
  if (/(\bit\b|\bthem\b|\bthose\b)/.test(t) && lastSelectedIds.length > 0) return lastSelectedIds;
  return candidateIds;
}

async function normalizeCommand(userMessage: string, visibleSummary: string, anywhere: boolean): Promise<NormalizedClarify | NormalizedAction | null> {
  try {
    const policy = [
      'You are a command normalizer for a collaborative canvas app. Output exactly one JSON object matching the schema.',
      'If the instruction is ambiguous or risky, return a clarification instead of guessing.',
      `Defaults: Rectangle default width=${CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH}, height=${CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT}`,
      `Defaults: Circle default diameter=${CANVAS_CONFIG.DEFAULT_CIRCLE_DIAMETER} (radius = diameter/2)`,
      'Placement: center new shapes in the current viewport when x/y are missing.',
      'Aspect ratio: if only aspectRatio is provided for rectangle, set height to the default rectangle height and width = aspectRatio * defaultHeight.',
      'Clarify when: deleting > 3 objects, resizing > 3x on either axis, or moving all objects off screen.',
      'Allowed actions: createRectangle, createCircle, createText, moveObject, resizeObject, rotateObject, arrangeHorizontal, arrangeVertical, arrangeGrid, distributeEvenly, deleteObjects, clarify.',
      'Visible-first policy: Prefer selecting from the current viewport contents listed below. Only consider offscreen objects if the user says "anywhere".',
      `User override anywhere=${anywhere ? 'true' : 'false'}`,
      'Recent user messages (last 20):',
      lastMessages.join('\n'),
      'Visible summary (top 20):',
      visibleSummary,
      'Output JSON only (no prose, no code fences).'
    ].join('\n');
    const prompt = `${policy}\n\nUser:\n${userMessage}`;
    const raw = await chatComplete(prompt);
    const text = (raw || '').trim().replace(/^```[\s\S]*?\n/, '').replace(/```$/, '');
    const parsed = JSON.parse(text) as any;
    if (parsed && (parsed.action === 'clarify' || parsed.action)) {
      debugLog('queue', 'normalize parsed', parsed);
      return parsed;
    }
    return null;
  } catch (err) {
    debugLog('queue', 'normalize failed; falling back', err);
    return null;
  }
}

// Lightweight classifier: simple | complex | conversational
async function classifyCommand(userMessage: string): Promise<'simple'|'complex'|'conversational'|null> {
  try {
    const prompt = [
      'You are a coordinating classifier inside a canvas app like Figma.',
      'You can perform the following operations: createRectangle, createCircle, createText, moveObject, resizeObject, rotateObject, arrangeHorizontal, arrangeVertical, arrangeGrid, distributeEvenly, deleteObjects.',
      'Classify the user prompt into exactly one of: simple, complex, conversational.',
      'Definitions:',
      '- simple: a single operation is sufficient and unambiguous',
      '- complex: multiple steps/operations or requires a short plan',
      '- conversational: not an actionable canvas command',
      'Respond strictly with one word: simple, complex, or conversational. No explanation.'
    ].join('\n');
    const raw = await chatComplete(`${prompt}\n\nUser:\n${userMessage}`);
    const out = (raw || '').trim().toLowerCase();
    const pick = out.includes('simple') ? 'simple' : out.includes('complex') ? 'complex' : out.includes('conversational') ? 'conversational' : null;
    debugLog('queue', 'classifier result', pick, out);
    return pick;
  } catch {
    return null;
  }
}

// Planner: produce concrete steps mapping 1:1 to allowed ops
type PlannedStep = { action: string; parameters: any };
async function planSteps(canvasId: string, userMessage: string, visibleSummary: string): Promise<PlannedStep[] | null> {
  try {
    const objects = await aiGetCanvasState(canvasId);
    // Compact state for the planner (limit to 100 objects)
    const compact = objects.slice(0, 100).map((o: any) => ({ id: o.id, type: o.type, x: o.x, y: o.y, width: o.width, height: o.height, rotation: o.rotation ?? 0, fill: o.fill ?? '' }));
    const schema = 'Return strict JSON: { "steps": [{ "action": string, "parameters": object }] }';
    const allowed = 'Allowed actions: createRectangle, createCircle, createText, moveObject, resizeObject, rotateObject, arrangeHorizontal, arrangeVertical, arrangeGrid, distributeEvenly, deleteObjects';
    const instructions = [
      'You are a planner for a canvas app like Figma. Use the provided canvas state to resolve shape references.',
      allowed + '.',
      'Resolve ids yourself from the supplied state when possible. If a target is ambiguous or missing, prefer selectors that our system can resolve (type/color/direction) and keep it to 1 operation per step.',
      'Do NOT include prose. ' + schema
    ].join('\n');
    const prompt = `${instructions}\n\nRecent user messages (last 20):\n${lastMessages.join('\n')}\n\nVisible summary (top 20):\n${visibleSummary}\n\nCanvas (up to 100):\n${JSON.stringify(compact)}\n\nUser:\n${userMessage}`;
    const raw = await chatComplete(prompt);
    const text = (raw || '').trim().replace(/^```[\s\S]*?\n/, '').replace(/```$/, '');
    const parsed = JSON.parse(text) as any;
    const steps = (parsed && Array.isArray(parsed.steps)) ? parsed.steps as PlannedStep[] : null;
    debugLog('queue', 'planner steps', steps?.length || 0, steps);
    return steps;
  } catch (e) {
    debugLog('queue', 'planner failed', e);
    return null;
  }
}

function getViewportBounds() {
  const { canvas } = store.getState() as any;
  const v = canvas?.viewport || { x: CANVAS_CONFIG.DEFAULT_VIEWPORT_X, y: CANVAS_CONFIG.DEFAULT_VIEWPORT_Y, zoom: 1 };
  const halfW = (CANVAS_CONFIG.VIEWPORT_WIDTH / 2) / (v.zoom || 1);
  const halfH = (CANVAS_CONFIG.VIEWPORT_HEIGHT / 2) / (v.zoom || 1);
  return { left: v.x - halfW, right: v.x + halfW, top: v.y - halfH, bottom: v.y + halfH };
}

function intersectsViewport(o: any, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
  const w = Number((o as any).width ?? 0);
  const h = Number((o as any).height ?? 0);
  const left = o.x;
  const right = o.x + w;
  const top = o.y;
  const bottom = o.y + h;
  return !(right < bounds.left || left > bounds.right || bottom < bounds.top || top > bounds.bottom);
}

async function getVisibleObjectIds(canvasId: string): Promise<Set<string>> {
  const bounds = getViewportBounds();
  const objects = await aiGetCanvasState(canvasId);
  const ids = objects.filter(o => intersectsViewport(o as any, bounds)).map(o => o.id);
  return new Set(ids);
}

function colorCategory(fill: any): string {
  if (!fill || typeof fill !== 'string') return 'other';
  const f = fill.toLowerCase().trim();
  const nameMap: Record<string, string> = { red: 'red', blue: 'blue', green: 'green', purple: 'purple', black: 'black', white: 'white', maroon: 'red', crimson: 'red', cyan: 'blue', navy: 'blue', lime: 'green', violet: 'purple', gray: 'black', grey: 'black' };
  if (nameMap[f]) return nameMap[f];
  const hex = f.match(/^#([0-9a-f]{6})$/i);
  const rgb = f.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  let r = -1, g = -1, b = -1;
  if (hex) { const v = hex[1]; r = parseInt(v.slice(0,2),16); g = parseInt(v.slice(2,4),16); b = parseInt(v.slice(4,6),16); }
  else if (rgb) { r = Number(rgb[1]); g = Number(rgb[2]); b = Number(rgb[3]); }
  if (r >= 0) {
    const max = Math.max(r,g,b);
    if (max === 0) return 'black';
    const sum = r+g+b; if (sum > 720) return 'white';
    if (max === r && r > g+10 && r > b+10) return 'red';
    if (max === g && g >= r && g >= b) return 'green';
    if (max === b && b >= r && b >= g) return 'blue';
    if (Math.abs(r-b) < 30 && r > g && b > g) return 'purple';
  }
  return 'other';
}

async function buildVisibleSummary(canvasId: string): Promise<string> {
  const bounds = getViewportBounds();
  const objects = await aiGetCanvasState(canvasId);
  const visible = objects.filter(o => intersectsViewport(o as any, bounds));
  const top = [...visible].sort((a, b) => (b as any).zIndex - (a as any).zIndex).slice(0, 20);
  const counts = {
    rectangles: visible.filter(o => o.type === 'rectangle').length,
    circles: visible.filter(o => o.type === 'circle').length,
    texts: visible.filter(o => o.type === 'text').length,
  };
  const lines = top.map(o => `${o.type} ${colorCategory((o as any).fill)} #${o.id.slice(0,6)} @(${o.x},${o.y}) w${(o as any).width} h${(o as any).height}${(o as any).rotation ? ` r${(o as any).rotation}` : ''}`);
  return `bounds=(${Math.round(bounds.left)},${Math.round(bounds.top)})-(${Math.round(bounds.right)},${Math.round(bounds.bottom)}) counts=${JSON.stringify(counts)}\n${lines.join('\n')}`;
}

async function resolveSelectorToIds(canvasId: string, selector: any, visibleOnly: boolean): Promise<string[]> {
  try {
    if (!selector) return [];
    // If selector is a string, treat it as natural-language description
    if (typeof selector === 'string') {
      let ids = await aiGetObjectsByDescription(selector, canvasId);
      if (visibleOnly) {
        const vis = await getVisibleObjectIds(canvasId);
        ids = ids.filter(id => vis.has(id));
      }
      return ids;
    }
    // If selector is an array, union of each element
    if (Array.isArray(selector)) {
      const all: string[] = [];
      for (const item of selector) {
        const sub = await resolveSelectorToIds(canvasId, item, visibleOnly);
        for (const id of sub) if (!all.includes(id)) all.push(id);
      }
      if (visibleOnly) {
        const vis = await getVisibleObjectIds(canvasId);
        return all.filter(id => vis.has(id));
      }
      return all;
    }
    // Object form
    if (Array.isArray(selector.ids) && selector.ids.length > 0) return selector.ids;
    let description = '';
    if (typeof selector.description === 'string') description = selector.description;
    else {
      const parts: string[] = [];
      if (selector.color && typeof selector.color === 'string') parts.push(String(selector.color));
      if (selector.type && typeof selector.type === 'string') {
        const t = String(selector.type).toLowerCase();
        // Use singular nouns in description; our matcher handles both
        parts.push(t);
      }
      description = parts.join(' ').trim();
    }
    let ids: string[] = [];
    if (description) ids = await aiGetObjectsByDescription(description, canvasId);
    if (!description) {
      const objects = await aiGetCanvasState(canvasId);
      ids = objects.map(o => o.id);
    }
    if (visibleOnly) {
      const vis = await getVisibleObjectIds(canvasId);
      ids = ids.filter(id => vis.has(id));
    }
    if (selector.count && selector.count !== 'all') {
      const n = Number(selector.count);
      if (!isNaN(n) && n > 0) ids = ids.slice(0, n);
    }
    return ids;
  } catch {
    return [];
  }
}

function extractColorFromText(text: string): 'red'|'blue'|'green'|'purple'|'black'|'white'|undefined {
  const m = (text || '').toLowerCase().match(/\b(red|blue|green|purple|black|white)\b/);
  return (m ? (m[1] as any) : undefined);
}

type ExecResult = { executed: boolean; shouldAck: boolean };

async function executeNormalized(canvasId: string, normalized: NormalizedAction, originalText: string, visibleOnly: boolean): Promise<ExecResult> {
  const a = normalized.action;
  const p = normalized.parameters || {};
  try {
    if (a === 'createRectangle') {
      const props = (p && typeof p === 'object' && p.properties && typeof p.properties === 'object') ? p.properties : {};
      const root = normalized as any;
      // Merge possible sources in priority: properties -> parameters -> root
      const q: any = { ...(root || {}), ...(p || {}), ...(props || {}) };
      const col = q.fill || q.color || extractColorFromText(originalText) || 'cadetblue';
      const defaultH = CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT;
      let width: number | undefined = typeof q.width === 'number' ? q.width : undefined;
      let height: number | undefined = typeof q.height === 'number' ? q.height : undefined;
      const aspect = typeof q.aspectRatio === 'number' ? q.aspectRatio : undefined;
      if (!width && !height && aspect) {
        height = defaultH; width = Math.max(CANVAS_CONFIG.MIN_GEOMETRY_SIZE, Math.round(defaultH * aspect));
      }
      if (!width) width = CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH;
      if (!height) height = CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT;
      const center = aiGetViewportCenter();
      const x = typeof q.x === 'number' ? q.x : Math.max(0, Math.round(center.x - width / 2));
      const y = typeof q.y === 'number' ? q.y : Math.max(0, Math.round(center.y - height / 2));
      const rotation = typeof q.rotation === 'number' ? q.rotation : undefined;
      debugLog('queue', 'normalized createRectangle', { x, y, width, height, col, rotation });
      const res = await aiCreateRectangle(x, y, width, height, col, canvasId, rotation);
      if (res?.objectId) rememberSelection([res.objectId]);
      return { executed: true, shouldAck: true };
    }
    if (a === 'createCircle') {
      const col = p.fill || extractColorFromText(originalText) || 'cadetblue';
      let radius: number | undefined = typeof p.radius === 'number' ? p.radius : undefined;
      if (!radius && typeof p.diameter === 'number') radius = Math.round(p.diameter / 2);
      if (!radius) radius = Math.round(CANVAS_CONFIG.DEFAULT_CIRCLE_DIAMETER / 2);
      const center = aiGetViewportCenter();
      const x = typeof p.x === 'number' ? p.x : Math.max(0, Math.round(center.x - radius));
      const y = typeof p.y === 'number' ? p.y : Math.max(0, Math.round(center.y - radius));
      debugLog('queue', 'normalized createCircle', { x, y, radius, col });
      const res = await aiCreateCircle(x, y, radius, col, canvasId);
      if (res?.objectId) rememberSelection([res.objectId]);
      return { executed: true, shouldAck: true };
    }
    if (a === 'createText') {
      const text: string = p.text || 'Text';
      const fontSize: number = typeof p.fontSize === 'number' ? p.fontSize : 16;
      const col = p.fill || '#000';
      const center = aiGetViewportCenter();
      const x = typeof p.x === 'number' ? p.x : Math.max(0, Math.round(center.x));
      const y = typeof p.y === 'number' ? p.y : Math.max(0, Math.round(center.y));
      debugLog('queue', 'normalized createText', { text, x, y, fontSize, col });
      const res = await aiCreateText(text, x, y, fontSize, col, canvasId);
      if (res?.objectId) rememberSelection([res.objectId]);
      return { executed: true, shouldAck: true };
    }
    if (a === 'createEllipse') {
      const root = normalized as any;
      const props = (p && typeof p === 'object' && (p as any).properties && typeof (p as any).properties === 'object') ? (p as any).properties : {};
      const q: any = { ...(root || {}), ...(p || {}), ...(props || {}) };
      const col = q.fill || q.color || extractColorFromText(originalText) || 'lime';
      const width = typeof q.width === 'number' ? q.width : 120;
      const height = typeof q.height === 'number' ? q.height : 120;
      const center = aiGetViewportCenter();
      const x = typeof q.x === 'number' ? q.x : Math.max(0, Math.round(center.x - width / 2));
      const y = typeof q.y === 'number' ? q.y : Math.max(0, Math.round(center.y - height / 2));
      debugLog('queue', 'normalized createEllipse', { x, y, width, height, col });
      const res = await aiCreateEllipse(x, y, width, height, col, canvasId);
      if (res?.objectId) rememberSelection([res.objectId]);
      return { executed: true, shouldAck: true };
    }
    if (a === 'moveObject') {
      const ids = await resolveSelectorToIds(canvasId, p.selector, visibleOnly);
      if (ids.length === 0) return { executed: false, shouldAck: true }; // nothing to do
      const x = typeof p.x === 'number' ? p.x : undefined;
      const y = typeof p.y === 'number' ? p.y : undefined;
      if (typeof x !== 'number' || typeof y !== 'number') return { executed: false, shouldAck: true };
      const allObjects = await aiGetCanvasState(canvasId);
      const movingAll = ids.length === allObjects.length;
      const offWorld = x < 0 || y < 0 || x > CANVAS_CONFIG.WORLD_WIDTH || y > CANVAS_CONFIG.WORLD_HEIGHT;
      if (movingAll && offWorld) {
        await postAIMessage(canvasId, 'Moving all objects off-screen. Do you want to proceed?');
        return { executed: true, shouldAck: false };
      }
      for (const id of ids) await aiMoveObject(id, x, y, canvasId);
      return { executed: true, shouldAck: true };
    }
    if (a === 'resizeObject') {
      const ids = await resolveSelectorToIds(canvasId, p.selector, visibleOnly);
      if (ids.length === 0) return { executed: false, shouldAck: true };
      const objects = await aiGetCanvasState(canvasId);
      const map = new Map(objects.map(o => [o.id, o] as const));
      const width = typeof p.width === 'number' ? p.width : undefined;
      const height = typeof p.height === 'number' ? p.height : undefined;
      const radius = typeof p.radius === 'number' ? p.radius : undefined;
      // Clarify if factor > 3x for any object
      let requiresClarify = false;
      for (const id of ids) {
        const o = map.get(id);
        if (!o) continue;
        if (radius && (o as any).width) {
          const currentR = (o as any).width / 2;
          if (radius > currentR * 3) { requiresClarify = true; break; }
        }
        if (typeof width === 'number' && (o as any).width && width > (o as any).width * 3) { requiresClarify = true; break; }
        if (typeof height === 'number' && (o as any).height && height > (o as any).height * 3) { requiresClarify = true; break; }
      }
      if (requiresClarify) {
        await postAIMessage(canvasId, 'That resize is more than 3x; should I proceed?');
        return { executed: true, shouldAck: false };
      }
      for (const id of ids) {
        if (radius && !width && !height) {
          const d = radius * 2; await aiResizeObject(id, d, d, canvasId);
        } else if (typeof width === 'number' && typeof height === 'number') {
          await aiResizeObject(id, width, height, canvasId);
        }
      }
      return { executed: true, shouldAck: true };
    }
    if (a === 'rotateObject') {
      // Merge possible sources: root normalized object, parameters, and nested properties
      const root = normalized as any;
      const props = (p && typeof p === 'object' && (p as any).properties && typeof (p as any).properties === 'object') ? (p as any).properties : {};
      const q: any = { ...(root || {}), ...(p || {}), ...(props || {}) };

      // Resolve target ids from objectId or selector-like fields
      let ids: string[] = [];
      if (typeof q.objectId === 'string') {
        const state = await aiGetCanvasState(canvasId);
        if (state.some(o => o.id === q.objectId)) {
          ids = [q.objectId];
        } else {
          ids = await aiGetObjectsByDescription(q.objectId, canvasId);
        }
      }
      if (ids.length === 0) {
        const selectorCandidate = q.selector ?? q.object ?? q.target ?? q.objects ?? q.description ?? null;
        ids = await resolveSelectorToIds(canvasId, selectorCandidate, visibleOnly);
      }
      // Apply pronoun memory
      ids = resolvePronouns(originalText, ids);
      if (ids.length === 0) {
        ids = await aiGetObjectsByDescription(originalText, canvasId);
        if (visibleOnly && ids.length > 0) {
          const vis = await getVisibleObjectIds(canvasId);
          ids = ids.filter(id => vis.has(id));
        }
      }
      if (ids.length === 0) return { executed: false, shouldAck: true };

      const degrees = typeof q.degrees === 'number' ? q.degrees
        : typeof q.angle === 'number' ? q.angle
        : typeof q.rotation === 'number' ? q.rotation
        : typeof q.degree === 'number' ? q.degree
        : 0;
      // Relative vs absolute rotation: default to relative unless the text says "to" explicitly
      const lower = (originalText || '').toLowerCase();
      const saysTo = /\bto\s*-?\d+\s*degree/.test(lower) || /\bset to\b/.test(lower) || /\babsolute\b/.test(lower);
      const isRelative = !saysTo || /\bby\b/.test(lower);
      debugLog('queue', 'normalized rotate', { ids, degrees, isRelative });
      if (isRelative) {
        const state = await aiGetCanvasState(canvasId);
        const map = new Map(state.map(o => [o.id, o] as const));
        for (const id of ids) {
          const cur = (map.get(id) as any)?.rotation ?? 0;
          const next = cur + degrees;
          await aiRotateObject(id, next, canvasId);
        }
      } else {
        for (const id of ids) await aiRotateObject(id, degrees, canvasId);
      }
      return { executed: true, shouldAck: true };
    }
    if (a === 'arrangeHorizontal') {
      const ids = await resolveSelectorToIds(canvasId, p.selector, visibleOnly);
      if (ids.length === 0) return { executed: false, shouldAck: true };
      const includeExisting = /include\s+(existing|all|everything)/i.test(originalText);
      await aiArrangeHorizontal(ids, typeof p.spacing === 'number' ? p.spacing : 16, canvasId, { onlyCreatedInLastCommand: !includeExisting });
      return { executed: true, shouldAck: true };
    }
    if (a === 'arrangeVertical') {
      const ids = await resolveSelectorToIds(canvasId, p.selector, visibleOnly);
      if (ids.length === 0) return { executed: false, shouldAck: true };
      const includeExisting = /include\s+(existing|all|everything)/i.test(originalText);
      await aiArrangeVertical(ids, typeof p.spacing === 'number' ? p.spacing : 16, canvasId, { onlyCreatedInLastCommand: !includeExisting });
      return { executed: true, shouldAck: true };
    }
    if (a === 'arrangeGrid') {
      const ids = await resolveSelectorToIds(canvasId, p.selector, visibleOnly);
      if (ids.length === 0) return { executed: false, shouldAck: true };
      const includeExisting = /include\s+(existing|all|everything)/i.test(originalText);
      await aiArrangeGrid(ids, typeof p.cols === 'number' ? p.cols : undefined, typeof p.spacing === 'number' ? p.spacing : 16, canvasId, { onlyCreatedInLastCommand: !includeExisting });
      return { executed: true, shouldAck: true };
    }
    if (a === 'distributeEvenly') {
      const ids = await resolveSelectorToIds(canvasId, p.selector, visibleOnly);
      if (ids.length < 3) return { executed: false, shouldAck: true };
      const axis: 'horizontal' | 'vertical' = p.axis === 'vertical' ? 'vertical' : 'horizontal';
      const includeExisting = /include\s+(existing|all|everything)/i.test(originalText);
      await aiDistributeEvenly(ids, axis, canvasId, { onlyCreatedInLastCommand: !includeExisting });
      return { executed: true, shouldAck: true };
    }
    if (a === 'deleteObjects' || a === 'delete' || a === 'deleteObject') {
      // Accept selector in multiple shapes
      const selectorCandidate = p.selector 
        ?? (normalized as any).selector 
        ?? (normalized as any).objects 
        ?? (normalized as any).object 
        ?? (normalized as any).targets 
        ?? (normalized as any).target 
        ?? (normalized as any).query 
        ?? (normalized as any).description 
        ?? null;
      // If normalizer returned explicit ids, prefer them
      if (Array.isArray((normalized as any).ids) && (normalized as any).ids.length > 0) {
        const explicit = resolvePronouns(originalText, (normalized as any).ids as string[]);
        // If visibleOnly, filter to visible
        let visFiltered = explicit;
        if (visibleOnly) {
          const vis = await getVisibleObjectIds(canvasId);
          visFiltered = explicit.filter(id => vis.has(id));
        }
        if (visFiltered.length > 0) {
          debugLog('queue', 'normalized delete ids (explicit)', visFiltered);
          if (visFiltered.length > 3) {
            await postAIMessage(canvasId, `You're deleting ${visFiltered.length} objects. Should I proceed?`);
            return { executed: true, shouldAck: false };
          }
          for (const id of visFiltered) await aiDeleteObject(id, canvasId);
          return { executed: true, shouldAck: true };
        }
      }

      // Heuristic: directional keywords in the request
      const wantsLower = /\b(lower|bottom)\b/i.test(originalText);
      const wantsUpper = /\b(upper|top)\b/i.test(originalText);
      const wantsLeft = /\bleft\b/i.test(originalText);
      const wantsRight = /\bright\b/i.test(originalText);

      let ids = resolvePronouns(originalText, await resolveSelectorToIds(canvasId, selectorCandidate, visibleOnly));
      if (ids.length === 0) {
        // Fallback: try original text
        ids = await aiGetObjectsByDescription(originalText, canvasId);
        if (visibleOnly && ids.length > 0) {
          const vis = await getVisibleObjectIds(canvasId);
          ids = ids.filter(id => vis.has(id));
        }
      }
      // Directional filter (upper/lower/left/right) based on viewport center
      if (ids.length > 0 && (wantsLower || wantsUpper || wantsLeft || wantsRight)) {
        // Viewport center not needed for current ranking
        const objects = await aiGetCanvasState(canvasId);
        const map = new Map(objects.map(o => [o.id, o] as const));
        const ranked = ids
          .map(id => {
            const o = map.get(id) as any; if (!o) return null;
            const cx = o.x + ((o.width ?? 0) / 2);
            const cy = o.y + ((o.height ?? 0) / 2);
            return { id, cx, cy };
          })
          .filter((v): v is { id: string; cx: number; cy: number } => !!v);

        ranked.sort((a, b) => {
          if (wantsLower) {
            if (b.cy !== a.cy) return b.cy - a.cy; // greatest Y first
            if (a.cx !== b.cx) return a.cx - b.cx; // tie-break leftmost
          } else if (wantsUpper) {
            if (a.cy !== b.cy) return a.cy - b.cy; // smallest Y first
            if (a.cx !== b.cx) return a.cx - b.cx; // tie-break leftmost
          } else if (wantsLeft) {
            if (a.cx !== b.cx) return a.cx - b.cx; // smallest X first
            if (a.cy !== b.cy) return a.cy - b.cy; // tie-break closest to top
          } else if (wantsRight) {
            if (b.cx !== a.cx) return b.cx - a.cx; // greatest X first
            if (a.cy !== b.cy) return a.cy - b.cy; // tie-break closest to top
          }
          return 0;
        });

        if (ranked.length > 0) ids = [ranked[0].id];
      }
      if (ids.length > 3) {
        await postAIMessage(canvasId, `You're deleting ${ids.length} objects. Should I proceed?`);
        return { executed: true, shouldAck: false };
      }
      debugLog('queue', 'normalized delete ids', ids);
      for (const id of ids) await aiDeleteObject(id, canvasId);
      rememberSelection(ids);
      return { executed: true, shouldAck: true };
    }
    // For other actions (move/resize/rotate/arrange/distribute/delete), keep current parser fallback for now
    debugLog('queue', 'normalized action not implemented; will fallback', a);
    return { executed: false, shouldAck: true };
  } catch (err) {
    debugError('queue', 'normalized execution failed', err);
    return { executed: false, shouldAck: true };
  }
}

// Basic naive parser to map commands to tools for MVP
async function executeParsed(canvasId: string, cmd: string): Promise<void> {
  const c = cmd.toLowerCase();
  debugLog('queue', 'parse received', { canvasId, cmd });
  // Handle rotation first to avoid false-positive "square/rectangle" create matches
  if (c.startsWith('rotate')) {
    const degMatch = c.match(/(-?\d+)\s*degree/); // matches degree or degrees
    const degrees = degMatch ? Number(degMatch[1]) : NaN;
    const ids = await aiGetObjectsByDescription(cmd, canvasId);
    if (!isNaN(degrees)) {
      for (const id of ids) { debugLog('queue', 'parse rotate', { id, degrees }); await aiRotateObject(id, degrees, canvasId); }
    }
    return;
  }
  if (c.includes('rectangle') || c.includes('square')) {
    const m = c.match(/rectangle.*?x\s*(\d+)\s*,\s*y\s*(\d+)\s*.*?width\s*(\d+)\s*.*?height\s*(\d+)/);
    const color = (c.match(/(red|blue|green|purple|black|white)/) || [])[1] || 'cadetblue';
    if (m) { debugLog('queue', 'parse rectangle explicit', { m, color }); await aiCreateRectangle(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), color, canvasId); return; }
    // Fallback: parse "make 100x100 red square" style
    const m2 = c.match(/(make|create).*?(\d+)x(\d+).*?(red|blue|green|purple|black|white)?.*?(square|rectangle)/);
    if (m2) {
      const w = Number(m2[2]); const h = Number(m2[3]);
      const col = (m2[4] as string) || 'cadetblue';
      // Default to viewport center when no explicit position is given
      const center = aiGetViewportCenter();
      const x = Math.max(0, Math.round(center.x - w / 2));
      const y = Math.max(0, Math.round(center.y - h / 2));
      debugLog('queue', 'parse rectangle center size-before-color', { x, y, w, h, col });
      await aiCreateRectangle(x, y, w, h, col, canvasId);
      return;
    }
    // Also handle phrasing with color before size: "make a red rectangle 100x300"
    const m3 = c.match(/(make|create).*?(red|blue|green|purple|black|white).*?(rectangle|square).*?(\d+)\s*x\s*(\d+)/);
    if (m3) {
      const w = Number(m3[4]); const h = Number(m3[5]);
      const col = (m3[2] as string) || 'cadetblue';
      const center = aiGetViewportCenter();
      const x = Math.max(0, Math.round(center.x - w / 2));
      const y = Math.max(0, Math.round(center.y - h / 2));
      debugLog('queue', 'parse rectangle color-before-size', { x, y, w, h, col });
      await aiCreateRectangle(x, y, w, h, col, canvasId);
      return;
    }
    // Minimal phrasing: "make a green rectangle" -> use defaults centered
    const colorOnly = (c.match(/(red|blue|green|purple|black|white)/) || [])[1] || 'cadetblue';
    const center = aiGetViewportCenter();
    const w = CANVAS_CONFIG.DEFAULT_RECTANGLE_WIDTH;
    const h = CANVAS_CONFIG.DEFAULT_RECTANGLE_HEIGHT;
    const x = Math.max(0, Math.round(center.x - w / 2));
    const y = Math.max(0, Math.round(center.y - h / 2));
    debugLog('queue', 'parse rectangle default size', { x, y, w, h, colorOnly });
    await aiCreateRectangle(x, y, w, h, colorOnly, canvasId);
    return;
  }
  if (c.includes('circle') || c.includes('ellipse') || c.includes('oval')) {
    const m = c.match(/circle.*?x\s*(\d+)\s*,\s*y\s*(\d+)\s*.*?radius\s*(\d+)/);
    const color = (c.match(/(red|blue|green|purple|black|white|lime|cyan|magenta)/) || [])[1] || 'lime';
    if (m) { debugLog('queue', 'parse circle explicit', { m, color }); await aiCreateCircle(Number(m[1]), Number(m[2]), Number(m[3]), color, canvasId); return; }
    const mE = c.match(/(ellipse|oval).*?x\s*(\d+)\s*,\s*y\s*(\d+)\s*.*?width\s*(\d+)\s*.*?height\s*(\d+)/);
    if (mE) { const x = Number(mE[2]); const y = Number(mE[3]); const w = Number(mE[4]); const h = Number(mE[5]); const col = (c.match(/(red|blue|green|purple|black|white|lime|cyan|magenta)/) || [])[1] || 'lime'; debugLog('queue', 'parse ellipse explicit', { x, y, w, h, col }); await aiCreateEllipse(x, y, w, h, col, canvasId); return; }
    // Fallback: parse shorthand without x/y: "oval width 240 height 120 lime"
    const mE2 = c.match(/(ellipse|oval).*?width\s*(\d+)\s*.*?height\s*(\d+)/);
    if (mE2) { const w = Number(mE2[2]); const h = Number(mE2[3]); const center = aiGetViewportCenter(); const x = Math.max(0, Math.round(center.x - w / 2)); const y = Math.max(0, Math.round(center.y - h / 2)); const col = (c.match(/(red|blue|green|purple|black|white|lime|cyan|magenta)/) || [])[1] || 'lime'; debugLog('queue', 'parse ellipse center fallback', { x, y, w, h, col }); await aiCreateEllipse(x, y, w, h, col, canvasId); return; }
  }
  // Circle phrasing like "make a green circle 600 pixels across" (diameter)
  if (c.includes('circle') && (c.includes('across') || c.includes('diameter') || c.includes('wide'))) {
    const color = (c.match(/(red|blue|green|purple|black|white)/) || [])[1] || 'lime';
    const dMatch = c.match(/(\d+)\s*(px|pixels)?\s*(across|diameter|wide)/);
    if (dMatch) {
      const diameter = Number(dMatch[1]);
      const radius = Math.max(1, Math.round(diameter / 2));
      const center = aiGetViewportCenter();
      const x = Math.max(0, Math.round(center.x - radius));
      const y = Math.max(0, Math.round(center.y - radius));
      debugLog('queue', 'parse circle diameter fallback', { x, y, radius, color });
      await aiCreateCircle(x, y, radius, color, canvasId);
      return;
    }
  }
  // Minimal circle phrasing without size: use default diameter centered
  if (c.includes('circle') && !c.match(/\d+/)) {
    const color = (c.match(/(red|blue|green|purple|black|white)/) || [])[1] || 'lime';
    const diameter = CANVAS_CONFIG.DEFAULT_CIRCLE_DIAMETER;
    const radius = Math.max(1, Math.round(diameter / 2));
    const center = aiGetViewportCenter();
    const x = Math.max(0, Math.round(center.x - radius));
    const y = Math.max(0, Math.round(center.y - radius));
    debugLog('queue', 'parse circle default diameter', { x, y, radius, color });
    await aiCreateCircle(x, y, radius, color, canvasId);
    return;
  }
  if (c.startsWith('create text') || c.startsWith('add text')) {
    const m = c.match(/text\s+"([^"]+)".*?x\s*(\d+)\s*,\s*y\s*(\d+)/) || c.match(/text.*?x\s*(\d+)\s*,\s*y\s*(\d+)/);
    if (m) { const text = m[1] || 'Text'; debugLog('queue', 'parse text explicit', { text }); await aiCreateText(text, Number(m[m.length-2]), Number(m[m.length-1]), 16, '#000', canvasId); return; }
  }
  if (c.startsWith('arrange horizontal')) {
    const ids = await aiGetObjectsByDescription(cmd, canvasId);
    if (ids.length > 0) { debugLog('queue', 'parse arrange horizontal', ids); await aiArrangeHorizontal(ids, 16, canvasId); }
    return;
  }
  if (c.startsWith('arrange vertical')) {
    const ids = await aiGetObjectsByDescription(cmd, canvasId);
    if (ids.length > 0) { debugLog('queue', 'parse arrange vertical', ids); await aiArrangeVertical(ids, 16, canvasId); }
    return;
  }
  if (c.startsWith('arrange grid')) {
    const ids = await aiGetObjectsByDescription(cmd, canvasId);
    if (ids.length > 0) { debugLog('queue', 'parse arrange grid', ids); await aiArrangeGrid(ids, undefined, 16, canvasId); }
    return;
  }
  if (c.startsWith('distribute') && c.includes('horizontal')) {
    const ids = await aiGetObjectsByDescription(cmd, canvasId);
    if (ids.length > 2) { debugLog('queue', 'parse distribute horizontal', ids); await aiDistributeEvenly(ids, 'horizontal', canvasId); }
    return;
  }
  if (c.startsWith('distribute') && c.includes('vertical')) {
    const ids = await aiGetObjectsByDescription(cmd, canvasId);
    if (ids.length > 2) { debugLog('queue', 'parse distribute vertical', ids); await aiDistributeEvenly(ids, 'vertical', canvasId); }
    return;
  }
  if (c.startsWith('rotate')) {
    const degMatch = c.match(/(-?\d+)\s*degree/);
    const degrees = degMatch ? Number(degMatch[1]) : NaN;
    const ids = await aiGetObjectsByDescription(cmd, canvasId);
    if (!isNaN(degrees)) {
      for (const id of ids) { debugLog('queue', 'parse rotate', { id, degrees }); await aiRotateObject(id, degrees, canvasId); }
    }
    return;
  }
  if (c.startsWith('resize')) {
    const ids = await aiGetObjectsByDescription(cmd, canvasId);
    const wMatch = c.match(/width\s*(\d+)/);
    const hMatch = c.match(/height\s*(\d+)/);
    const rMatch = c.match(/radius\s*(\d+)/);
    const width = wMatch ? Number(wMatch[1]) : undefined;
    const height = hMatch ? Number(hMatch[1]) : undefined;
    const radius = rMatch ? Number(rMatch[1]) : undefined;
    for (const id of ids) {
      if (radius && !width && !height) {
        const d = radius * 2;
        debugLog('queue', 'parse resize radius', { id, radius });
        await aiResizeObject(id, d, d, canvasId);
      } else if (width && height) {
        debugLog('queue', 'parse resize width/height', { id, width, height });
        await aiResizeObject(id, width, height, canvasId);
      } else if (width) {
        // Keep height same by setting width and mirroring to width (approx); without object read, set height = width for square-ish
        debugLog('queue', 'parse resize width only', { id, width });
        await aiResizeObject(id, width, width, canvasId);
      } else if (height) {
        debugLog('queue', 'parse resize height only', { id, height });
        await aiResizeObject(id, height, height, canvasId);
      }
    }
    return;
  }
  if (c.startsWith('move')) {
    const ids = await aiGetObjectsByDescription(cmd, canvasId);
    const m = c.match(/x\s*(\d+)\s*,\s*y\s*(\d+)/);
    if (m && ids.length > 0) {
      const [_, xs, ys] = m;
      const x = Number(xs); const y = Number(ys);
      for (const id of ids) { debugLog('queue', 'parse move', { id, x, y }); await aiMoveObject(id, x, y, canvasId); }
    }
    return;
  }
  if (c.startsWith('help')) {
    const help = [
      'Create rectangle x 100, y 200, width 150, height 100 red',
      'Create circle x 400, y 300, radius 60 blue',
      'Create text "Hello" x 500, y 350',
      'Arrange horizontal red rectangles',
      'Distribute vertical circles',
      'Rotate red rectangles 45 degrees',
      'Resize blue circle radius 120',
      'Move red rectangles to x 300, y 300',
      'Undo the last 3'
    ].join(' • ');
    await postAIMessage(canvasId, help);
    return;
  }
  if (c.includes("what's on the canvas") || c.includes('whats on the canvas') || c.includes('what is on the canvas') || c.includes('list objects')) {
    const objects = await aiGetCanvasState(canvasId);
    const summary = objects.map(o => `${o.type}#${o.id.slice(0,6)} @ (${o.x},${o.y})`).slice(0, 20).join(' • ');
    await postAIMessage(canvasId, summary || 'Canvas is empty.');
    return;
  }
  if (c.startsWith('undo the last three') || c.startsWith('undo last three')) {
    await undoLastNCommands(canvasId, 3);
    return;
  }
  if (c.startsWith('undo the last') || c.startsWith('undo last')) {
    const m = c.match(/undo\s+(the\s+)?last\s+(\d+)/);
    if (m) {
      await undoLastNCommands(canvasId, Number(m[2]));
    } else {
      await undoLastCommand(canvasId);
    }
    return;
  }
  if (c.startsWith('delete')) {
    const ids = await aiGetObjectsByDescription(cmd, canvasId);
    for (const id of ids) {
      debugLog('queue', 'parse delete', { id });
      await aiDeleteObject(id, canvasId);
    }
    return;
  }
  // Fallback: no-op for MVP
}

export async function startQueueProcessor(canvasId: string): Promise<void> {
  const ref = collection(db, `commandQueue/${canvasId}/commands`);
  onSnapshot(query(ref, where('status', '==', 'queued'), orderBy('timestamp', 'asc'), limit(1)), async (snap) => {
    debugLog('queue', 'snapshot size', snap.size);
    const next = snap.docs[0];
    if (!next) return;
    const id = next.id;
    try {
      debugLog('queue', 'processing', { id, data: next.data() });
      await setStatus(canvasId, id, 'executing');
      const { command } = next.data() as any;
      await postAIMessage(canvasId, `Executing: ${command}`);
      rememberMessage(command);
      // Classify → route
      let shouldAck = true;
      const anywhere = /\banywhere\b/i.test(command);
      const visibleSummary = await buildVisibleSummary(canvasId);
      const classification = await classifyCommand(command);
      if (classification === 'conversational') {
        try {
          const reply = await chatComplete(command);
          const safe = (reply || '').replace(/```[\s\S]*?```/g, '').trim();
          await postAIMessage(canvasId, safe || '');
        } catch {
          await postAIMessage(canvasId, '');
        }
        shouldAck = false;
      } else if (classification === 'complex') {
        const steps = await planSteps(canvasId, command, visibleSummary);
        if (steps && steps.length > 0) {
          for (const step of steps) {
            await executeNormalized(canvasId, step as any, command, !anywhere);
          }
        } else {
          // Fall back to normalizer if planning fails
          const normalized = await normalizeCommand(command, visibleSummary, anywhere);
          if (normalized && (normalized as any).action === 'clarify') {
            const clar = normalized as any;
            await postAIMessage(canvasId, clar.question || 'Could you clarify your request?');
            shouldAck = false;
          } else if (normalized) {
            const exec = await executeNormalized(canvasId, normalized as any, command, !anywhere);
            shouldAck = exec.shouldAck;
          } else {
            await executeParsed(canvasId, command);
          }
        }
      } else {
        // simple (or null): use normalizer → parser fallback
        const normalized = await normalizeCommand(command, visibleSummary, anywhere);
        if (normalized && (normalized as any).action === 'clarify') {
          const clar = normalized as any;
          await postAIMessage(canvasId, clar.question || 'Could you clarify your request?');
          shouldAck = false;
        } else if (normalized) {
          const exec = await executeNormalized(canvasId, normalized as any, command, !anywhere);
          shouldAck = exec.shouldAck;
        } else {
          await executeParsed(canvasId, command);
        }
      }
      await setStatus(canvasId, id, 'complete');
      // Simple AI reply for now via proxy (not used for tool-calling yet)
      if (shouldAck) {
        try {
          const reply = await chatComplete(`User said: ${command}. If this is a canvas command, simply acknowledge with a brief confirmation (no code, no HTML). Otherwise, answer concisely.`);
          const safe = (reply || '').replace(/```[\s\S]*?```/g, '').trim();
          await postAIMessage(canvasId, safe || `Done: ${command}`);
        } catch (e: any) {
          debugError('queue', 'chatComplete failed', e);
          await postAIMessage(canvasId, `Done: ${command}`);
        }
      }
      // Remove after short delay
      setTimeout(async () => { debugLog('queue', 'deleting processed command', { id }); await deleteDoc(doc(db, `commandQueue/${canvasId}/commands`, id)); }, 1500);
    } catch (err: any) {
      debugError('queue', 'failed', { id, error: err });
      await setStatus(canvasId, id, 'failed', err?.message || 'Failed');
      await postAIMessage(canvasId, `Failed: ${err?.message || 'Unknown error'}`);
    }
  });
}


