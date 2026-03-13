import type { CompiledMap } from '../schema/map-schema';

const key = (tileX: number, tileY: number) => `${tileX}:${tileY}`;

export function isBlocked(compiledMap: CompiledMap, tileX: number, tileY: number): boolean {
  return compiledMap.blockedTiles.includes(key(tileX, tileY));
}
