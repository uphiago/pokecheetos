import type { CompiledMap } from '../schema/map-schema';

const key = (tileX: number, tileY: number) => `${tileX}:${tileY}`;

export function findTransitionAtTile(compiledMap: CompiledMap, tileX: number, tileY: number) {
  return compiledMap.transitions.find((transition) => transition.tileKey === key(tileX, tileY));
}
