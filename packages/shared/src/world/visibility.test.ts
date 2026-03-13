import { describe, expect, it } from 'vitest';
import { isTileVisible } from './visibility';

describe('visibility', () => {
  it('includes tiles inside the configured rectangle', () => {
    expect(
      isTileVisible({ tileX: 10, tileY: 10 }, { tileX: 12, tileY: 11 }, { width: 32, height: 24 })
    ).toBe(true);
  });

  it('excludes tiles outside the configured rectangle', () => {
    expect(
      isTileVisible({ tileX: 10, tileY: 10 }, { tileX: 40, tileY: 40 }, { width: 32, height: 24 })
    ).toBe(false);
  });
});
