import { describe, expect, it } from 'vitest';
import { createRemoteInterpolationTarget, tileToPixelPosition } from './entity-presenter.ts';

describe('entity presenter', () => {
  it('maps local authoritative tile coordinates to exact pixels', () => {
    const pixels = tileToPixelPosition({ tileX: 7, tileY: 4 }, 16);
    expect(pixels).toEqual({ x: 112, y: 64 });
  });

  it('produces interpolation targets for remote entities', () => {
    const target = createRemoteInterpolationTarget(
      { x: 80, y: 48 },
      { tileX: 6, tileY: 4 },
      16,
      0.5
    );

    expect(target.authoritative).toEqual({ x: 96, y: 64 });
    expect(target.presented).toEqual({ x: 88, y: 56 });
  });
});
