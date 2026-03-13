import { describe, expect, it } from 'vitest';
import { applyDirection, toPixelPosition } from './tiles';

describe('tiles', () => {
  it('applies direction correctly', () => {
    expect(applyDirection({ tileX: 10, tileY: 10 }, 'up')).toEqual({ tileX: 10, tileY: 9 });
    expect(applyDirection({ tileX: 10, tileY: 10 }, 'down')).toEqual({ tileX: 10, tileY: 11 });
    expect(applyDirection({ tileX: 10, tileY: 10 }, 'left')).toEqual({ tileX: 9, tileY: 10 });
    expect(applyDirection({ tileX: 10, tileY: 10 }, 'right')).toEqual({ tileX: 11, tileY: 10 });
  });

  it('converts tile to pixel coordinates', () => {
    expect(toPixelPosition({ tileX: 2, tileY: 3 }, 32)).toEqual({ x: 64, y: 96 });
  });
});
