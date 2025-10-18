import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CANVAS_CONFIG } from '../src/types/canvas';

vi.mock('../src/firebase/canvasSync', () => {
  return {
    loadCanvas: vi.fn(),
    updateObjectInCanvas: vi.fn().mockResolvedValue(undefined),
    updateCanvasObjects: vi.fn().mockResolvedValue(undefined),
    addObjectToCanvas: vi.fn().mockResolvedValue(undefined),
    deleteObjectFromCanvas: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../src/ai/history', () => {
  return {
    logAICommand: vi.fn().mockResolvedValue(undefined),
    getLastNCommands: vi.fn().mockResolvedValue([])
  };
});

import { loadCanvas } from '../src/firebase/canvasSync';
import { aiResizeObject, aiResizeCircle, aiResizeText } from '../src/ai/aiTools';

describe('aiTools resize validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects sizes below MIN_GEOMETRY_SIZE', async () => {
    (loadCanvas as any).mockResolvedValue({ id: 'main', objects: [
      { id: 'r1', type: 'rectangle', x: 10, y: 10, width: 100, height: 100, zIndex: 1, createdAt: 0, updatedAt: 0, lastModifiedBy: 'u' }
    ]});
    const tooSmall = CANVAS_CONFIG.MIN_GEOMETRY_SIZE - 1;
    const res = await aiResizeObject('r1', tooSmall, tooSmall, 'main');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/at least/i);
  });

  it('rejects resize that would exceed world bounds', async () => {
    (loadCanvas as any).mockResolvedValue({ id: 'main', objects: [
      { id: 'r2', type: 'rectangle', x: CANVAS_CONFIG.WORLD_WIDTH - 100, y: CANVAS_CONFIG.WORLD_HEIGHT - 100, width: 100, height: 100, zIndex: 1, createdAt: 0, updatedAt: 0, lastModifiedBy: 'u' }
    ]});
    const res = await aiResizeObject('r2', 200, 200, 'main');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/outside canvas bounds/i);
  });

  it('resizes circle via diameter from radius with validation', async () => {
    (loadCanvas as any).mockResolvedValue({ id: 'main', objects: [
      { id: 'c1', type: 'circle', x: 0, y: 0, width: 100, height: 100, zIndex: 1, createdAt: 0, updatedAt: 0, lastModifiedBy: 'u' }
    ]});
    const smallRadius = Math.max(1, Math.floor((CANVAS_CONFIG.MIN_GEOMETRY_SIZE - 1) / 2));
    const bad = await aiResizeCircle('c1', smallRadius, 'main');
    expect(bad.success).toBe(false);
    const ok = await aiResizeCircle('c1', Math.ceil(CANVAS_CONFIG.MIN_GEOMETRY_SIZE / 2), 'main');
    expect(ok.success).toBe(true);
  });

  it('resizes text by font size and keeps within world', async () => {
    (loadCanvas as any).mockResolvedValue({ id: 'main', objects: [
      { id: 't1', type: 'text', x: 10, y: 10, width: 120, height: 24, fontSize: 20, zIndex: 1, createdAt: 0, updatedAt: 0, lastModifiedBy: 'u', rotation: 0, fill: '#000' }
    ]});
    const res = await aiResizeText('t1', 10, 'main');
    expect(res.success).toBe(true);
  });
});


