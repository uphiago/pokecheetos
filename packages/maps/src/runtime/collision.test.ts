import { describe, expect, it } from 'vitest';
import type { CompiledMap } from '../schema/map-schema';
import { isBlocked } from './collision';

const map: CompiledMap = {
  mapId: 'town',
  width: 10,
  height: 10,
  defaultSpawnId: 'spawn',
  blockedTiles: ['3:4'],
  spawns: { spawn: { tileX: 1, tileY: 1 } },
  transitions: [],
  npcs: []
};

describe('collision', () => {
  it('returns true when tile is blocked', () => {
    expect(isBlocked(map, 3, 4)).toBe(true);
  });

  it('returns false when tile is free', () => {
    expect(isBlocked(map, 1, 1)).toBe(false);
  });
});
