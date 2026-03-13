import { describe, expect, it } from 'vitest';
import { loadCompiledMap } from './map-registry';
import { findTransitionAtTile } from './transitions';

describe('transitions', () => {
  it('returns destination map and spawn at transition tile', () => {
    const map = loadCompiledMap('town');
    const transition = findTransitionAtTile(map, 10, 0);
    expect(transition?.toMapId).toBe('route-1');
    expect(transition?.toSpawnId).toBe('route_entry');
  });
});
