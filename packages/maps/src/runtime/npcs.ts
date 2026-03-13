import type { CompiledMap } from '../schema/map-schema';

export function getNpcById(compiledMap: CompiledMap, npcId: string) {
  return compiledMap.npcs.find((npc) => npc.id === npcId);
}
