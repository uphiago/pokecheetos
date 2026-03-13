import { describe, expect, it } from 'vitest';
import type { AuthoredMap } from '../schema/map-schema';
import { compileMap } from './compile-map';

function baseMap(): AuthoredMap {
  return {
    mapId: 'town',
    width: 10,
    height: 10,
    defaultSpawnId: 'spawn',
    blockedTiles: [],
    spawns: [{ id: 'spawn', tileX: 1, tileY: 1 }],
    transitions: [],
    npcs: [{ id: 'npc-1', tileX: 2, tileY: 2, facing: 'down', blocking: true, textId: 'hello' }]
  };
}

describe('compileMap', () => {
  it('throws when defaultSpawnId is missing', () => {
    const map = { ...baseMap(), defaultSpawnId: undefined };
    expect(() => compileMap(map, [map])).toThrow(/defaultSpawnId/);
  });

  it('throws when transition missing toMapId', () => {
    const map = { ...baseMap(), transitions: [{ tileX: 1, tileY: 2, toSpawnId: 'spawn' }] } as AuthoredMap;
    expect(() => compileMap(map, [map])).toThrow(/toMapId/);
  });

  it('throws when transition missing toSpawnId', () => {
    const map = { ...baseMap(), transitions: [{ tileX: 1, tileY: 2, toMapId: 'town' }] } as AuthoredMap;
    expect(() => compileMap(map, [map])).toThrow(/toSpawnId/);
  });

  it('throws when transition points to unknown destination spawn', () => {
    const destination = { ...baseMap(), mapId: 'route-1', spawns: [{ id: 'ok', tileX: 0, tileY: 0 }] };
    const map = {
      ...baseMap(),
      transitions: [{ tileX: 1, tileY: 2, toMapId: 'route-1', toSpawnId: 'missing' }]
    } as AuthoredMap;
    expect(() => compileMap(map, [map, destination])).toThrow(/unknown spawn/);
  });

  it('throws when npc missing textId', () => {
    const map = {
      ...baseMap(),
      npcs: [{ id: 'npc-1', tileX: 2, tileY: 2, facing: 'down', blocking: true }]
    } as AuthoredMap;
    expect(() => compileMap(map, [map])).toThrow(/textId/);
  });

  it('compiles valid map into runtime shape', () => {
    const destination = { ...baseMap(), mapId: 'route-1', spawns: [{ id: 'spawn-2', tileX: 0, tileY: 0 }] };
    const map = {
      ...baseMap(),
      blockedTiles: [{ tileX: 4, tileY: 5 }],
      transitions: [{ tileX: 9, tileY: 9, toMapId: 'route-1', toSpawnId: 'spawn-2' }]
    } as AuthoredMap;

    const compiled = compileMap(map, [map, destination]);
    expect(compiled.blockedTiles).toContain('4:5');
    expect(compiled.spawns.spawn).toEqual({ tileX: 1, tileY: 1 });
    expect(compiled.transitions[0]).toEqual({ tileKey: '9:9', toMapId: 'route-1', toSpawnId: 'spawn-2' });
    expect(compiled.npcs[0].textId).toBe('hello');
  });
});
