import { describe, expect, it, vi } from 'vitest';
import { PlayerState } from '../schema/player-state';
import { WorldRoom } from './world-room';

describe('WorldRoom npc_interact', () => {
  it('sends npc_dialogue when interaction is valid', () => {
    const room = new WorldRoom();
    room.onCreate({ mapId: 'town', roomId: 'town:base:1', maxClients: 50 });

    const player = new PlayerState();
    player.guestId = 'guest-1';
    player.displayName = 'Guest 1';
    player.mapId = 'town';
    player.tileX = 6;
    player.tileY = 5;
    player.direction = 'down';

    const send = vi.fn();
    room.state.players.set('session-1', player);

    room.handleNpcInteract({ sessionId: 'session-1', send }, 'npc-town-1');

    expect(send).toHaveBeenCalledWith('npc_dialogue', {
      type: 'npc_dialogue',
      npcId: 'npc-town-1',
      lines: ['town.greeter']
    });
  });

  it('sends room_error when interaction is invalid', () => {
    const room = new WorldRoom();
    room.onCreate({ mapId: 'town', roomId: 'town:base:1', maxClients: 50 });

    const player = new PlayerState();
    player.guestId = 'guest-1';
    player.displayName = 'Guest 1';
    player.mapId = 'town';
    player.tileX = 1;
    player.tileY = 1;
    player.direction = 'up';

    const send = vi.fn();
    room.state.players.set('session-1', player);

    room.handleNpcInteract({ sessionId: 'session-1', send }, 'npc-town-1');

    expect(send).toHaveBeenCalledWith(
      'room_error',
      expect.objectContaining({
        type: 'room_error',
        code: 'invalid_interaction'
      })
    );
  });
});
