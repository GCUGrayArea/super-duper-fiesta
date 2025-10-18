import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CanvasObject } from '../types/canvas';
import { deleteObjectFromCanvas, updateObjectInCanvas, addObjectToCanvas } from '../firebase/canvasSync';

export interface AICommandLog {
  id?: string;
  canvasId: string;
  timestamp: number;
  commandType: string;
  parameters?: Record<string, any>;
  objectsCreated?: string[];
  objectsModified?: string[];
  objectsDeleted?: string[];
  // Previous states for modified/deleted objects to enable undo
  previousStates?: { id: string; state: CanvasObject }[];
  status?: 'success' | 'failed';
  errorMessage?: string;
}

export async function logAICommand(entry: AICommandLog): Promise<void> {
  await addDoc(collection(db, 'aiCommands'), entry);
}

export async function getLastNCommands(canvasId: string, n: number): Promise<AICommandLog[]> {
  const q = query(
    collection(db, 'aiCommands'),
    where('canvasId', '==', canvasId),
    orderBy('timestamp', 'desc'),
    limit(n)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as AICommandLog));
}

async function revertCommand(cmd: AICommandLog): Promise<void> {
  const canvasId = cmd.canvasId;
  // Undo created objects: delete them
  if (cmd.objectsCreated && cmd.objectsCreated.length > 0) {
    for (const id of cmd.objectsCreated) {
      await deleteObjectFromCanvas(canvasId, id, 'ai-agent', []);
    }
  }
  // Undo modified objects: restore previous states
  if (cmd.previousStates && cmd.previousStates.length > 0) {
    for (const prev of cmd.previousStates) {
      const { id, state } = prev;
      const updates = { ...state } as any;
      // Only send changed fields is ideal, but for undo we can overwrite common fields
      await updateObjectInCanvas(canvasId, id, updates, 'ai-agent', []);
    }
  }
  // Undo deleted objects: recreate from previous states
  if (cmd.objectsDeleted && cmd.objectsDeleted.length > 0 && cmd.previousStates) {
    const map = new Map(cmd.previousStates.map(s => [s.id, s.state] as const));
    for (const id of cmd.objectsDeleted) {
      const obj = map.get(id);
      if (obj) {
        await addObjectToCanvas(canvasId, obj, []);
      }
    }
  }
}

export async function undoLastCommand(canvasId: string): Promise<boolean> {
  const last = await getLastNCommands(canvasId, 1);
  if (last.length === 0) return false;
  await revertCommand(last[0]);
  await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'undoLast', status: 'success' });
  return true;
}

export async function undoLastNCommands(canvasId: string, n: number): Promise<boolean> {
  const cmds = await getLastNCommands(canvasId, n);
  if (cmds.length === 0) return false;
  for (const c of cmds) {
    await revertCommand(c);
  }
  await logAICommand({ canvasId, timestamp: Date.now(), commandType: 'undoLastN', parameters: { n }, status: 'success' });
  return true;
}


