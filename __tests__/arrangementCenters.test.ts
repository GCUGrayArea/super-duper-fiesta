import { describe, it, expect } from 'vitest';
import { arrangeHorizontal, arrangeVertical } from '../src/utils/arrangement';
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
  rotation: 0,
  zIndex: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastModifiedBy: 'test'
} as any);

describe('arrangement centers', () => {
  it('arranges horizontally by centers', () => {
    const a = rect('a', 0, 0, 100, 50); // center x=50
    const b = rect('b', 200, 0, 100, 50); // center x=250
    const res = arrangeHorizontal([a, b], ['a', 'b'], 20);
    const ra = res.find(o => o.id === 'a')!;
    const rb = res.find(o => o.id === 'b')!;
    const centerA = ra.x + (ra as any).width / 2;
    const centerB = rb.x + (rb as any).width / 2;
    expect(centerB - centerA).toBeGreaterThan(100); // at least original width + spacing
  });

  it('arranges vertically by centers', () => {
    const a = rect('a', 0, 0, 80, 80);
    const b = rect('b', 0, 200, 60, 60);
    const res = arrangeVertical([a, b], ['a', 'b'], 20);
    const ra = res.find(o => o.id === 'a')!;
    const rb = res.find(o => o.id === 'b')!;
    const centerA = ra.y + (ra as any).height / 2;
    const centerB = rb.y + (rb as any).height / 2;
    expect(centerB).toBeGreaterThan(centerA);
  });
});


