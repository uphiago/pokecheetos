import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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

    assert.equal(store.getLocalPlayer()?.id, 'local-1');
    assert.deepEqual(
      store.getVisiblePlayers().map((p) => p.id).sort(),
      ['remote-1', 'remote-2']
    );
  });

  it('applies visibility enter/leave updates for remote players', () => {
    const store = new WorldStore();

    store.applyVisibility({ enter: [player({ id: 'remote-1' })], leave: [] });
    assert.equal(store.getVisiblePlayers().length, 1);

    store.applyVisibility({
      enter: [player({ id: 'remote-2' })],
      leave: ['remote-1']
    });

    assert.deepEqual(
      store.getVisiblePlayers().map((p) => p.id),
      ['remote-2']
    );
  });

  it('stores npc dialogue payloads as latest dialogue state', () => {
    const store = new WorldStore();

    store.handleEvent({
      type: 'npc_dialogue',
      npcId: 'npc-oak',
      lines: ['Olá!', 'Bem-vindo ao mundo.']
    });

    assert.deepEqual(store.getDialogue(), {
      npcId: 'npc-oak',
      lines: ['Olá!', 'Bem-vindo ao mundo.']
    });
  });
});
