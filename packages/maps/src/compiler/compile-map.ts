import type { AuthoredMap, CompiledMap } from '../schema/map-schema';
import { validateAuthoredMap } from './validate-authored-map';

const key = (tileX: number, tileY: number) => `${tileX}:${tileY}`;

export function compileMap(map: AuthoredMap, allMaps: AuthoredMap[]): CompiledMap {
  validateAuthoredMap(map, allMaps);

  return {
    mapId: map.mapId,
    width: map.width,
    height: map.height,
    defaultSpawnId: map.defaultSpawnId as string,
    blockedTiles: map.blockedTiles.map((tile) => key(tile.tileX, tile.tileY)),
    spawns: Object.fromEntries(map.spawns.map((spawn) => [spawn.id, { tileX: spawn.tileX, tileY: spawn.tileY }])),
    transitions: map.transitions.map((transition) => ({
      tileKey: key(transition.tileX, transition.tileY),
      toMapId: transition.toMapId as string,
      toSpawnId: transition.toSpawnId as string
    })),
    npcs: map.npcs.map((npc) => ({
      id: npc.id,
      tileX: npc.tileX,
      tileY: npc.tileY,
      facing: npc.facing,
      blocking: npc.blocking,
      textId: npc.textId as string
    }))
  };
}
