import type { AuthoredMap } from '../schema/map-schema';

export function validateAuthoredMap(map: AuthoredMap, allMaps: AuthoredMap[]): void {
  if (!map.defaultSpawnId) throw new Error(`Map ${map.mapId} missing defaultSpawnId`);
  if (!map.spawns.some((s) => s.id === map.defaultSpawnId)) {
    throw new Error(`Map ${map.mapId} defaultSpawnId points to unknown spawn`);
  }

  for (const npc of map.npcs) {
    if (!npc.textId) throw new Error(`Map ${map.mapId} npc ${npc.id} missing textId`);
  }

  for (const transition of map.transitions) {
    if (!transition.toMapId) throw new Error(`Map ${map.mapId} transition missing toMapId`);
    if (!transition.toSpawnId) throw new Error(`Map ${map.mapId} transition missing toSpawnId`);
    const destinationMap = allMaps.find((m) => m.mapId === transition.toMapId);
    if (!destinationMap) throw new Error(`Map ${map.mapId} transition points to unknown map ${transition.toMapId}`);
    if (!destinationMap.spawns.some((s) => s.id === transition.toSpawnId)) {
      throw new Error(
        `Map ${map.mapId} transition points to unknown spawn ${transition.toSpawnId} in ${transition.toMapId}`
      );
    }
  }
}
