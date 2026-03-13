import { describe, expect, it } from 'vitest';
import type { Direction } from '@pokecheetos/shared';
import { WorldStore, type WorldPlayerSnapshot } from './world-store.ts';

function player(overrides: Partial<WorldPlayerSnapshot> = {}): WorldPlayerSnapshot {
  return {
    id: 'player-1',
    displayName: 'Player 1',
    mapId: 'town',
    tileX: 10,
    tileY: 8,
    direction: 'down' satisfies Direction,
    ...overrides
  };
}

describe('WorldStore', () => {
  it('keeps local authoritative state separate from remote visible players', () => {
    const store = new WorldStore();

    store.setLocalPlayer(player({ id: 'local-1', displayName: 'Local Hero' }));
    store.applyVisibility({
      enter: [player({ id: 'remote-1' }), player({ id: 'remote-2' })],
      leave: []
    });

    expect(store.getLocalPlayer()?.id).toBe('local-1');
    expect(store.getVisiblePlayers().map((p) => p.id).sort()).toEqual([
      'remote-1',
      'remote-2'
    ]);
  });

  it('applies visibility enter/leave updates for remote players', () => {
    const store = new WorldStore();

    store.applyVisibility({ enter: [player({ id: 'remote-1' })], leave: [] });
    expect(store.getVisiblePlayers().length).toBe(1);

    store.applyVisibility({
      enter: [player({ id: 'remote-2' })],
      leave: ['remote-1']
    });

    expect(store.getVisiblePlayers().map((p) => p.id)).toEqual(['remote-2']);
  });

  it('stores npc dialogue payloads as latest dialogue state', () => {
    const store = new WorldStore();

    store.handleEvent({
      type: 'npc_dialogue',
      npcId: 'npc-oak',
      lines: ['Olá!', 'Bem-vindo ao mundo.']
    });

    expect(store.getDialogue()).toEqual({
      npcId: 'npc-oak',
      lines: ['Olá!', 'Bem-vindo ao mundo.']
    });
  });
});
