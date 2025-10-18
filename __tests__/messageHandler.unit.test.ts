import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// Stub tool schema usage by intercepting proxy
const proxySpy = vi.fn();
vi.mock('../src/ai/messageHandler', async (orig) => {
  const actual = await (orig() as any);
  return {
    ...actual,
    // Re-export real for type
  };
});

// Intercept the global fetch used by messageHandler to the proxy
const originalFetch = global.fetch as any;

import { handleUserMessageWithTools } from '../src/ai/messageHandler';

describe('messageHandler tool-calling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns assistant content when no tool calls', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'Hello' } }] }) });
    const res = await handleUserMessageWithTools('hi', 'main', [] as any);
    expect(res).toBe('Hello');
  });

  it('executes a single createRectangle tool call and returns final response', async () => {
    // First call triggers tool call
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { tool_calls: [{ id: 't1', function: { name: 'createRectangle', arguments: JSON.stringify({ x: 10, y: 10, width: 100, height: 50, fill: 'red' }) } }] } }] }) })
      // Second call returns assistant content
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'Created a red rectangle.' } }] }) });
    const res = await handleUserMessageWithTools('create a red rectangle', 'main', [] as any);
    expect(res).toMatch(/Created/i);
    expect((global.fetch as any).mock.calls.length).toBe(2);
  });

  it('asks for clarification when >3 deleteObject tool calls', async () => {
    const tool_calls = Array.from({ length: 4 }).map((_, i) => ({ id: `d${i}`, function: { name: 'deleteObject', arguments: JSON.stringify({ objectId: `o${i}` }) } }));
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { tool_calls } }] }) });
    const res = await handleUserMessageWithTools('delete many', 'main', [] as any);
    expect(res).toMatch(/deleting 4 objects/i);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });
});


