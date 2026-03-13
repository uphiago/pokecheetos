import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRemoteInterpolationTarget, tileToPixelPosition } from './entity-presenter.ts';

describe('entity presenter', () => {
  it('maps local authoritative tile coordinates to exact pixels', () => {
    const pixels = tileToPixelPosition({ tileX: 7, tileY: 4 }, 16);
    assert.deepEqual(pixels, { x: 112, y: 64 });
  });

  it('produces interpolation targets for remote entities', () => {
    const target = createRemoteInterpolationTarget(
      { x: 80, y: 48 },
      { tileX: 6, tileY: 4 },
      16,
      0.5
    );

    assert.deepEqual(target.authoritative, { x: 96, y: 64 });
    assert.deepEqual(target.presented, { x: 88, y: 56 });
  });
});
