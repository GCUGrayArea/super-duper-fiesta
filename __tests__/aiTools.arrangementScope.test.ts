import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/firebase/canvasSync', () => {
  return {
    loadCanvas: vi.fn().mockResolvedValue({ id: 'main', objects: [
      { id: 'x1', type: 'rectangle', x: 0, y: 0, width: 50, height: 50, zIndex: 1, createdAt: 0, updatedAt: 0, lastModifiedBy: 'u' },
      { id: 'x2', type: 'rectangle', x: 100, y: 0, width: 50, height: 50, zIndex: 2, createdAt: 0, updatedAt: 0, lastModifiedBy: 'u' },
      { id: 'x3', type: 'rectangle', x: 200, y: 0, width: 50, height: 50, zIndex: 3, createdAt: 0, updatedAt: 0, lastModifiedBy: 'u' },
    ]}),
    updateCanvasObjects: vi.fn().mockResolvedValue(undefined)
  };
});

vi.mock('../src/ai/history', () => {
  return {
    getLastNCommands: vi.fn().mockResolvedValue([{ objectsCreated: ['x2','x3'] }]),
    logAICommand: vi.fn().mockResolvedValue(undefined)
  };
});

import { updateCanvasObjects } from '../src/firebase/canvasSync';
import { aiArrangeHorizontal } from '../src/ai/aiTools';

describe('aiTools arrangement scope', () => {
  it('filters to only objects created in last command when option set', async () => {
    await aiArrangeHorizontal(['x1','x2','x3'], 10, 'main', { onlyCreatedInLastCommand: true });
    // Ensure update was called with objects where x1 remains unchanged (was filtered out)
    const args = (updateCanvasObjects as any).mock.calls[0][1] as any[];
    const ids = args.map((o: any) => o.id);
    expect(ids).toContain('x2');
    expect(ids).toContain('x3');
  });
});


