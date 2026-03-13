import { describe, expect, it } from 'vitest';
import { loadCompiledMap } from './map-registry';
import { getNpcById } from './npcs';

describe('npcs', () => {
  it('returns npc metadata by id', () => {
    const map = loadCompiledMap('town');
    const npc = getNpcById(map, 'npc-town-1');
    expect(npc?.blocking).toBe(true);
    expect(npc?.textId).toBe('town.greeter');
  });
});
