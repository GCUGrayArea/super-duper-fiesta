import { describe, it, expect } from 'vitest';
import { arrangeGrid, distributeEvenly } from '../src/utils/arrangement';
import { CanvasObject } from '../src/types/canvas';

const rect = (id: string, x: number, y: number, w: number, h: number): CanvasObject => ({
  id,
  type: 'rectangle',
  x,
  y,
  width: w,
  height: h,
  fill: 'red',
  stroke: 'black',
  strokeWidth: 1,
  opacity: 1,
  rotation: 0 as any,
  zIndex: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastModifiedBy: 't'
} as any);

describe('arrangement grid and distribute', () => {
  it('arrangeGrid positions items into rows with spacing', () => {
    const a = rect('a', 0, 0, 50, 20);
    const b = rect('b', 100, 0, 60, 30);
    const c = rect('c', 200, 0, 40, 25);
    const res = arrangeGrid([a, b, c], ['a','b','c'], { spacing: 10, columns: 2, viewportWidth: 400 });
    const ra = res.find(o => o.id === 'a')!;
    const rb = res.find(o => o.id === 'b')!;
    const rc = res.find(o => o.id === 'c')!;
    expect(rb.x).toBeGreaterThanOrEqual(ra.x + (ra as any).width + 10);
    expect(rc.y).toBeGreaterThanOrEqual(ra.y + (ra as any).height + 10);
  });

  it('distributeEvenly horizontally keeps first/last and spaces middles', () => {
    const a = rect('a', 0, 0, 20, 20);
    const b = rect('b', 100, 0, 20, 20);
    const c = rect('c', 200, 0, 20, 20);
    const res = distributeEvenly([a,b,c], ['a','b','c'], 'horizontal');
    const ra = res.find(o => o.id === 'a')!;
    const rb = res.find(o => o.id === 'b')!;
    const rc = res.find(o => o.id === 'c')!;
    expect(ra.x).toBe(a.x);
    expect(rc.x).toBe(c.x);
    expect(rb.x).toBeGreaterThan(ra.x);
    expect(rb.x).toBeLessThan(rc.x);
  });
});


