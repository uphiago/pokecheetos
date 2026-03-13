import { describe, expect, it } from 'vitest';
import type { MapTransitionEvent, NpcDialogueEvent, RoomErrorEvent } from './server-to-client';

describe('server-to-client protocol', () => {
  it('matches room error event', () => {
    const event: RoomErrorEvent = { type: 'room_error', code: 'room_full', message: 'full' };
    expect(event.type).toBe('room_error');
  });

  it('matches npc dialogue event', () => {
    const event: NpcDialogueEvent = { type: 'npc_dialogue', npcId: 'npc-1', lines: ['oi'] };
    expect(event.lines[0]).toBe('oi');
  });

  it('matches map transition event', () => {
    const event: MapTransitionEvent = { type: 'map_transition', mapId: 'route-1', roomIdHint: 'route-1:base:1' };
    expect(event.mapId).toBe('route-1');
  });
});
