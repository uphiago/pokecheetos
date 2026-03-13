import { describe, expect, it } from 'vitest';
import type { MoveIntentCommand, NpcInteractCommand } from './client-to-server';

describe('client-to-server protocol', () => {
  it('matches move intent command shape', () => {
    const cmd: MoveIntentCommand = { type: 'move_intent', direction: 'up', pressed: true };
    expect(cmd.type).toBe('move_intent');
    expect(cmd.direction).toBe('up');
  });

  it('matches npc interact command shape', () => {
    const cmd: NpcInteractCommand = { type: 'npc_interact', npcId: 'npc-1' };
    expect(cmd.npcId).toBe('npc-1');
  });
});
