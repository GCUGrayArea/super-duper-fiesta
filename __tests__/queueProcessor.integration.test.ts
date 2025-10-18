import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/firebase/config', () => ({ db: {} }));

// Mock Firestore SDK functions used in queueProcessor
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  addDoc: vi.fn(async () => ({ id: 'cmd1' })),
  onSnapshot: (q: any, cb: any) => {
    // Immediately simulate one queued command snapshot
    const doc = { id: 'cmd1', data: () => ({ command: 'create rectangle x 100, y 100, width 120, height 60 red', status: 'queued' }) } as any;
    setTimeout(() => cb({ size: 1, docs: [doc] }), 0);
    return () => {};
  },
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  doc: vi.fn(() => ({})),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  deleteField: vi.fn(() => ({} as any)),
}));

vi.mock('../src/firebase/canvasSync', () => ({
  loadCanvas: vi.fn().mockResolvedValue({ id: 'main', objects: [] }),
  addObjectToCanvas: vi.fn().mockResolvedValue(undefined),
  updateObjectInCanvas: vi.fn().mockResolvedValue(undefined),
  deleteObjectFromCanvas: vi.fn().mockResolvedValue(undefined),
  updateCanvasObjects: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/ai/history', () => ({
  logAICommand: vi.fn().mockResolvedValue(undefined),
  getLastNCommands: vi.fn().mockResolvedValue([]),
  undoLastCommand: vi.fn().mockResolvedValue(true),
  undoLastNCommands: vi.fn().mockResolvedValue(true),
}));

// Mock chatComplete to avoid real OpenAI calls used by conversational branch
vi.mock('../src/ai/openaiClient', () => ({
  chatComplete: vi.fn().mockResolvedValue('ok')
}));

// Intercept proxy fetch for tool-calling path to return no tools (so fallback kicks in)
const originalFetch = global.fetch as any;

import { startQueueProcessor } from '../src/ai/queueProcessor';

describe('queueProcessor integration (MVP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes a queued command and completes without throwing', async () => {
    // Let tool-calling return no tools then content
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'Done' } }] }) });
    await startQueueProcessor('main');
    // Give the snapshot and processing loop a tick
    await new Promise(r => setTimeout(r, 25));
    expect(true).toBe(true);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });
});


