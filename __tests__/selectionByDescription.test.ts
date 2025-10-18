import { describe, it, expect } from 'vitest';
import { aiGetObjectsByDescription } from '../src/ai/aiTools';

// This is a lightweight placeholder test; in real tests we'd mock Firestore
describe('selection by description (smoke)', () => {
  it('returns an array (does not throw)', async () => {
    const ids = await aiGetObjectsByDescription('red rectangles', 'main');
    expect(Array.isArray(ids)).toBe(true);
  });
});


