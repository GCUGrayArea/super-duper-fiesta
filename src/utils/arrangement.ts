import { CanvasObject, CANVAS_CONFIG } from '../types/canvas';

function byIds(objects: CanvasObject[], ids: string[]): CanvasObject[] {
  const map = new Map(objects.map(o => [o.id, o] as const));
  return ids.map(id => map.get(id)).filter((o): o is CanvasObject => !!o);
}

function getSize(obj: CanvasObject): { width: number; height: number } {
  return { width: (obj as any).width as number, height: (obj as any).height as number };
}

function getCenter(obj: CanvasObject): { cx: number; cy: number } {
  const { width, height } = getSize(obj);
  return { cx: obj.x + width / 2, cy: obj.y + height / 2 };
}

function getBoundingBox(targets: CanvasObject[]) {
  const minX = Math.min(...targets.map(o => o.x));
  const minY = Math.min(...targets.map(o => o.y));
  const maxX = Math.max(...targets.map(o => o.x + (o as any).width));
  const maxY = Math.max(...targets.map(o => o.y + (o as any).height));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function replaceObjects(base: CanvasObject[], updates: Map<string, Partial<CanvasObject>>): CanvasObject[] {
  return base.map(obj => {
    const u = updates.get(obj.id);
    return u ? ({ ...obj, ...(u as any), updatedAt: Date.now() } as CanvasObject) : obj;
  }) as CanvasObject[];
}

export function arrangeHorizontal(
  objects: CanvasObject[],
  objectIds: string[],
  spacing = 16
): CanvasObject[] {
  const targets = byIds(objects, objectIds);
  if (targets.length === 0) return objects;
  const centers = targets.map(o => ({ o, ...getSize(o), ...getCenter(o) }));
  const startCX = Math.min(...centers.map(c => c.cx));
  const baseCY = Math.min(...centers.map(c => c.cy));

  let cursorCX = startCX;
  const updates = new Map<string, Partial<CanvasObject>>();
  for (let i = 0; i < centers.length; i++) {
    const { o, width, height } = centers[i];
    if (i > 0) {
      const prevW = centers[i - 1].width;
      cursorCX += (prevW / 2) + spacing + (width / 2);
    }
    const x = Math.round(cursorCX - width / 2);
    const y = Math.round(baseCY - height / 2);
    updates.set(o.id, { x, y });
  }
  return replaceObjects(objects as CanvasObject[], updates) as CanvasObject[];
}

export function arrangeVertical(
  objects: CanvasObject[],
  objectIds: string[],
  spacing = 16
): CanvasObject[] {
  const targets = byIds(objects, objectIds);
  if (targets.length === 0) return objects;
  const centers = targets.map(o => ({ o, ...getSize(o), ...getCenter(o) }));
  const startCY = Math.min(...centers.map(c => c.cy));
  const baseCX = Math.min(...centers.map(c => c.cx));

  let cursorCY = startCY;
  const updates = new Map<string, Partial<CanvasObject>>();
  for (let i = 0; i < centers.length; i++) {
    const { o, width, height } = centers[i];
    if (i > 0) {
      const prevH = centers[i - 1].height;
      cursorCY += (prevH / 2) + spacing + (height / 2);
    }
    const x = Math.round(baseCX - width / 2);
    const y = Math.round(cursorCY - height / 2);
    updates.set(o.id, { x, y });
  }
  return replaceObjects(objects as CanvasObject[], updates) as CanvasObject[];
}

export function arrangeGrid(
  objects: CanvasObject[],
  objectIds: string[],
  options?: { spacing?: number; columns?: number; viewportWidth?: number }
): CanvasObject[] {
  const spacing = options?.spacing ?? 16;
  const viewportWidth = options?.viewportWidth ?? CANVAS_CONFIG.VIEWPORT_WIDTH;
  const targets = byIds(objects, objectIds);
  if (targets.length === 0) return objects;
  const { minX, minY } = getBoundingBox(targets);

  let cols = options?.columns;
  if (!cols || cols <= 0) {
    // Auto-calc columns by packing from minX across available viewport width
    let rowWidth = 0;
    let count = 0;
    for (const obj of targets) {
      const w = (obj as any).width as number;
      if (count === 0) {
        rowWidth = w;
        count = 1;
        continue;
      }
      if (rowWidth + spacing + w <= viewportWidth) {
        rowWidth += spacing + w;
        count += 1;
      } else {
        break;
      }
    }
    cols = Math.max(1, count || 1);
  }

  const updates = new Map<string, Partial<CanvasObject>>();
  let row = 0;
  let col = 0;
  let rowY = minY;
  let currentRowMaxH = 0;
  for (const obj of targets) {
    // const w = (obj as any).width as number;
    const h = (obj as any).height as number;

    const x = minX + col * (spacing) + // spacing gaps
      // Sum widths of prior items in row
      (targets
        .slice(row * (cols as number), row * (cols as number) + col)
        .reduce((acc, o) => acc + (o as any).width, 0) as number);

    updates.set(obj.id, { x, y: rowY });
    currentRowMaxH = Math.max(currentRowMaxH, h);

    col += 1;
    if (col >= (cols as number)) {
      row += 1;
      col = 0;
      rowY += currentRowMaxH + spacing;
      currentRowMaxH = 0;
    }
  }
  return replaceObjects(objects as CanvasObject[], updates) as CanvasObject[];
}

export function distributeEvenly(
  objects: CanvasObject[],
  objectIds: string[],
  axis: 'horizontal' | 'vertical'
): CanvasObject[] {
  const targets = byIds(objects, objectIds);
  if (targets.length <= 2) return objects; // Nothing to distribute with < 3
  const sorted = [...targets].sort((a, b) => {
    const ac = getCenter(a); const bc = getCenter(b);
    return axis === 'horizontal' ? ac.cx - bc.cx : ac.cy - bc.cy;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const firstC = getCenter(first);
  const lastC = getCenter(last);

  const updates = new Map<string, Partial<CanvasObject>>();
  updates.set(first.id, { x: first.x, y: first.y });
  updates.set(last.id, { x: last.x, y: last.y });

  if (axis === 'horizontal') {
    const gap = (lastC.cx - firstC.cx) / (sorted.length - 1);
    for (let i = 1; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const { width, height } = getSize(cur);
      const targetCX = firstC.cx + gap * i;
      const x = Math.round(targetCX - width / 2);
      // Keep vertical alignment at min center among selected
      const minCY = Math.min(...sorted.map(s => getCenter(s).cy));
      const y = Math.round(minCY - height / 2);
      updates.set(cur.id, { x, y });
    }
  } else {
    const gap = (lastC.cy - firstC.cy) / (sorted.length - 1);
    for (let i = 1; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const { width, height } = getSize(cur);
      const targetCY = firstC.cy + gap * i;
      const y = Math.round(targetCY - height / 2);
      const minCX = Math.min(...sorted.map(s => getCenter(s).cx));
      const x = Math.round(minCX - width / 2);
      updates.set(cur.id, { x, y });
    }
  }
  return replaceObjects(objects, updates);
}


