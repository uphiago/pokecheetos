import { describe, expect, it, vi } from 'vitest';
import { PlayerState } from '../schema/player-state';
import { WorldRoom } from './world-room';

describe('WorldRoom move_intent', () => {
  it('tracks pressed and released direction state', () => {
    const room = new WorldRoom();

    room.handleMoveIntent({ sessionId: 'session-1' }, { direction: 'left', pressed: true });
    expect(room.getMovementInput('session-1')).toEqual({ heldDirection: 'left' });

    room.handleMoveIntent({ sessionId: 'session-1' }, { direction: 'left', pressed: false });
    expect(room.getMovementInput('session-1')).toEqual({});
  });

  it('keeps one-step buffered direction and promotes it when consumed', () => {
    const room = new WorldRoom();

    room.handleMoveIntent({ sessionId: 'session-1' }, { direction: 'up', pressed: true });
    room.handleMoveIntent({ sessionId: 'session-1' }, { direction: 'right', pressed: true });

    expect(room.getMovementInput('session-1')).toEqual({
      heldDirection: 'up',
      bufferedDirection: 'right'
    });

    room.consumeBufferedDirection('session-1');

    expect(room.getMovementInput('session-1')).toEqual({
      heldDirection: 'right'
    });
  });
});

describe('WorldRoom simulation', () => {
  it('applies simulation result, consumes buffered input, and emits map_transition', () => {
    const simulateStep = vi.fn(() => ({
      moved: true,
      mapChanged: true,
      consumedBufferedDirection: true,
      player: {
        mapId: 'route-1',
        tileX: 1,
        tileY: 1,
        direction: 'up' as const
      },
      transition: {
        mapId: 'route-1',
        spawnId: 'route_entry',
        roomIdHint: 'route-1:base:1'
      }
    }));

    const room = new WorldRoom({
      worldSimulationService: { simulateStep },
      loadMapById: () => ({
        mapId: 'town',
        width: 12,
        height: 12,
        defaultSpawnId: 'spawn',
        blockedTiles: [],
        spawns: { spawn: { tileX: 2, tileY: 2 } },
        transitions: [],
        npcs: []
      })
    });

    const player = new PlayerState();
    player.guestId = 'guest-1';
    player.displayName = 'Guest 1';
    player.mapId = 'town';
    player.tileX = 10;
    player.tileY = 1;
    player.direction = 'right';
    room.state = { players: new Map([['session-1', player]]), mapId: 'town', roomId: 'town:base:1' } as any;

    room.handleMoveIntent({ sessionId: 'session-1' }, { direction: 'down', pressed: true });
    room.handleMoveIntent({ sessionId: 'session-1' }, { direction: 'up', pressed: true });

    const send = vi.fn();
    room.simulateStepForClient({ sessionId: 'session-1', send });

    expect(simulateStep).toHaveBeenCalledWith(
      expect.objectContaining({
        guestId: 'guest-1',
        heldDirection: 'down',
        bufferedDirection: 'up'
      })
    );
    expect(room.getMovementInput('session-1')).toEqual({ heldDirection: 'up' });
    expect(player.mapId).toBe('route-1');
    expect(player.tileX).toBe(1);
    expect(player.tileY).toBe(1);
    expect(player.direction).toBe('up');
    expect(send).toHaveBeenCalledWith('map_transition', {
      type: 'map_transition',
      mapId: 'route-1',
      roomIdHint: 'route-1:base:1'
    });
  });
});

describe('WorldRoom visibility', () => {
  it('tracks visibility enter/leave using the configured rectangle on the same map', () => {
    const room = new WorldRoom();

    const observer = new PlayerState();
    observer.guestId = 'guest-observer';
    observer.displayName = 'Observer';
    observer.mapId = 'town';
    observer.tileX = 10;
    observer.tileY = 10;
    observer.direction = 'down';

    const nearby = new PlayerState();
    nearby.guestId = 'guest-nearby';
    nearby.displayName = 'Nearby';
    nearby.mapId = 'town';
    nearby.tileX = 20;
    nearby.tileY = 20;
    nearby.direction = 'left';

    const farAway = new PlayerState();
    farAway.guestId = 'guest-far';
    farAway.displayName = 'Far Away';
    farAway.mapId = 'town';
    farAway.tileX = 40;
    farAway.tileY = 40;
    farAway.direction = 'up';

    const otherMap = new PlayerState();
    otherMap.guestId = 'guest-other-map';
    otherMap.displayName = 'Other Map';
    otherMap.mapId = 'route-1';
    otherMap.tileX = 10;
    otherMap.tileY = 10;
    otherMap.direction = 'right';

    room.state = {
      players: new Map([
        ['observer', observer],
        ['nearby', nearby],
        ['far-away', farAway],
        ['other-map', otherMap]
      ]),
      mapId: 'town',
      roomId: 'town:base:1'
    } as any;

    expect(room.computeVisibilityDiff('observer')).toEqual({ entered: ['nearby'], left: [] });
    expect(room.computeVisibilityDiff('observer')).toEqual({ entered: [], left: [] });

    nearby.tileX = 41;
    nearby.tileY = 41;

    expect(room.computeVisibilityDiff('observer')).toEqual({ entered: [], left: ['nearby'] });
  });
});

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
