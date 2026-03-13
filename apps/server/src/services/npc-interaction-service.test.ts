import { describe, expect, it } from 'vitest';
import type { CompiledMap } from '@pokecheetos/maps';
import { createNpcInteractionService } from './npc-interaction-service';

const compiledMap: CompiledMap = {
  mapId: 'town',
  width: 20,
  height: 20,
  defaultSpawnId: 'spawn',
  blockedTiles: [],
  spawns: {
    spawn: { tileX: 1, tileY: 1 }
  },
  transitions: [],
  npcs: [
    {
      id: 'npc-1',
      tileX: 5,
      tileY: 5,
      facing: 'down',
      blocking: true,
      textId: 'town.greeter'
    }
  ]
};

describe('npc interaction service', () => {
  it('accepts valid adjacent and facing interaction', () => {
    const service = createNpcInteractionService({
      resolveDialogueLines: (textId) => [`line:${textId}`]
    });

    const result = service.interact({
      compiledMap,
      npcId: 'npc-1',
      player: { tileX: 5, tileY: 4, direction: 'down' }
    });

    expect(result).toEqual({
      ok: true,
      npcId: 'npc-1',
      textId: 'town.greeter',
      lines: ['line:town.greeter']
    });
  });

  it('rejects invalid npc id', () => {
    const service = createNpcInteractionService();

    const result = service.interact({
      compiledMap,
      npcId: 'npc-missing',
      player: { tileX: 5, tileY: 4, direction: 'down' }
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: 'npc_not_found' });
  });

  it('rejects non-adjacent interaction', () => {
    const service = createNpcInteractionService();

    const result = service.interact({
      compiledMap,
      npcId: 'npc-1',
      player: { tileX: 5, tileY: 2, direction: 'down' }
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: 'npc_not_adjacent' });
  });

  it('rejects wrong-facing interaction', () => {
    const service = createNpcInteractionService();

    const result = service.interact({
      compiledMap,
      npcId: 'npc-1',
      player: { tileX: 5, tileY: 4, direction: 'up' }
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: 'npc_wrong_facing' });
  });
});
