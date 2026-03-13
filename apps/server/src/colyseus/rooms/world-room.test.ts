import { Protocol } from 'colyseus';
import { createPresenceService } from '../../services/presence-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlayerState } from '../schema/player-state';
import { WorldRoom } from './world-room';

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it('persists authoritative movement through the injected player repository', () => {
    const repository = {
      updateLastKnownState: vi.fn(),
      updateLastSeenAt: vi.fn()
    };

    const room = new WorldRoom({
      playerRepository: repository,
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
    player.guestId = 'guest-9';
    player.displayName = 'Guest 9';
    player.mapId = 'town';
    player.tileX = 2;
    player.tileY = 2;
    player.direction = 'up';
    room.state = { players: new Map([['session-9', player]]), mapId: 'town', roomId: 'town:base:1' } as any;

    room.handleMoveIntent({ sessionId: 'session-9' }, { direction: 'right', pressed: true });
    room.simulateStepForClient({ sessionId: 'session-9', send: vi.fn() });

    expect(repository.updateLastKnownState).toHaveBeenCalledWith('guest-9', {
      lastMapId: 'town',
      lastTileX: 3,
      lastTileY: 2,
      lastDirection: 'right'
    });
    expect(repository.updateLastSeenAt).toHaveBeenCalledWith('guest-9');
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

describe('WorldRoom join lifecycle', () => {
  it('logs join failures with request and guest context and closes the client gracefully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const leave = vi.fn();
    const room = new WorldRoom({
      presenceService: {
        register() {
          throw new Error('presence unavailable');
        },
        unregister() {}
      }
    });
    room.onCreate({ mapId: 'town', roomId: 'town:base:1', maxClients: 50 });

    await expect(
      room.onJoin(
        {
          sessionId: 'session-join-failure',
          leave
        } as any,
        {
          requestId: 'req-123',
          guestId: 'guest-join-failure',
          guestToken: 'token-1',
          displayName: 'Guest Failure',
          mapId: 'town',
          tileX: 5,
          tileY: 6,
          roomIdHint: 'town:base:1'
        }
      )
    ).rejects.toThrow('presence unavailable');

    expect(leave).toHaveBeenCalledWith(Protocol.WS_CLOSE_WITH_ERROR, 'room join failed');
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0]))).toMatchObject({
      level: 'error',
      event: 'room_join_failed',
      phase: 'join',
      requestId: 'req-123',
      guestId: 'guest-join-failure',
      sessionId: 'session-join-failure',
      roomId: 'town:base:1',
      mapId: 'town',
      errorMessage: 'presence unavailable'
    });
  });

  it('ejects the older gameplay connection when the same guest joins twice', async () => {
    const leave = vi.fn();
    const room = new WorldRoom({
      presenceService: createPresenceService(),
      clientRegistry: new Map()
    });
    room.onCreate({ mapId: 'town', roomId: 'town:base:1', maxClients: 50 });

    await room.onJoin(
      {
        sessionId: 'session-1',
        leave,
        send: vi.fn()
      } as any,
      {
        guestId: 'guest-1',
        guestToken: 'token-1',
        displayName: 'Guest 1',
        mapId: 'town',
        tileX: 5,
        tileY: 6,
        roomIdHint: 'town:base:1'
      }
    );

    await room.onJoin(
      {
        sessionId: 'session-2',
        leave: vi.fn(),
        send: vi.fn()
      } as any,
      {
        guestId: 'guest-1',
        guestToken: 'token-1',
        displayName: 'Guest 1 Replacement',
        mapId: 'town',
        tileX: 7,
        tileY: 8,
        roomIdHint: 'town:base:1'
      }
    );

    expect(leave).toHaveBeenCalledTimes(1);
    expect(room.state.players.has('session-1')).toBe(false);
    expect(room.state.players.get('session-2')).toEqual(
      expect.objectContaining({
        guestId: 'guest-1',
        displayName: 'Guest 1 Replacement',
        mapId: 'town',
        tileX: 7,
        tileY: 8
      })
    );
  });

  it('restores player authoritative state when reconnecting within the configured window', async () => {
    vi.useFakeTimers();
    const room = new WorldRoom({
      presenceService: createPresenceService(),
      clientRegistry: new Map()
    });
    room.onCreate({ mapId: 'town', roomId: 'town:base:1', maxClients: 50 });

    await room.onJoin(
      {
        sessionId: 'session-1',
        leave: vi.fn(),
        send: vi.fn()
      } as any,
      {
        guestId: 'guest-1',
        guestToken: 'token-1',
        displayName: 'Guest 1',
        mapId: 'town',
        tileX: 5,
        tileY: 6,
        roomIdHint: 'town:base:1'
      }
    );

    const original = room.state.players.get('session-1');
    original!.tileX = 11;
    original!.tileY = 12;
    original!.direction = 'left';

    room.onLeave({ sessionId: 'session-1' }, false);
    vi.advanceTimersByTime(1_000);

    await room.onJoin(
      {
        sessionId: 'session-2',
        leave: vi.fn(),
        send: vi.fn()
      } as any,
      {
        guestId: 'guest-1',
        guestToken: 'token-1',
        displayName: 'Guest 1 New Bootstrap',
        mapId: 'town',
        tileX: 1,
        tileY: 1,
        roomIdHint: 'town:base:2'
      }
    );

    expect(room.state.players.get('session-2')).toEqual(
      expect.objectContaining({
        guestId: 'guest-1',
        displayName: 'Guest 1',
        mapId: 'town',
        tileX: 11,
        tileY: 12,
        direction: 'left'
      })
    );

    vi.useRealTimers();
  });

  it('logs patch serialization failures and disconnects affected clients without crashing the room process', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const leave = vi.fn();
    const room = new WorldRoom();
    room.onCreate({ mapId: 'town', roomId: 'town:base:1', maxClients: 50 });

    const player = new PlayerState();
    player.guestId = 'guest-serialize';
    player.displayName = 'Serialize Guest';
    player.mapId = 'town';
    player.tileX = 2;
    player.tileY = 3;
    player.direction = 'down';
    room.state.players.set('session-serialize', player);
    room.clients.push({
      sessionId: 'session-serialize',
      state: 1,
      leave
    } as any);

    (room as any)._serializer = {
      applyPatches() {
        throw new Error('state encode exploded');
      }
    };

    expect(room.broadcastPatch()).toBe(false);
    expect(leave).toHaveBeenCalledWith(Protocol.WS_CLOSE_WITH_ERROR, 'room state patch failed');
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0]))).toMatchObject({
      level: 'error',
      event: 'room_state_patch_failed',
      phase: 'serialize',
      roomId: 'town:base:1',
      mapId: 'town',
      sessionIds: ['session-serialize'],
      guestIds: ['guest-serialize'],
      errorMessage: 'state encode exploded'
    });
  });

  it('logs full-state serialization failures and disconnects the joining client gracefully', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const leave = vi.fn();
    const raw = vi.fn();
    const room = new WorldRoom();
    room.onCreate({ mapId: 'town', roomId: 'town:base:1', maxClients: 50 });

    const player = new PlayerState();
    player.guestId = 'guest-full-state';
    player.displayName = 'Full State Guest';
    player.mapId = 'town';
    player.tileX = 4;
    player.tileY = 4;
    player.direction = 'down';
    room.state.players.set('session-full-state', player);

    (room as any)._serializer = {
      getFullState() {
        throw new Error('full state encode exploded');
      }
    };

    room.sendFullState({
      sessionId: 'session-full-state',
      leave,
      raw
    } as any);

    expect(raw).not.toHaveBeenCalled();
    expect(leave).toHaveBeenCalledWith(Protocol.WS_CLOSE_WITH_ERROR, 'room full state failed');
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0]))).toMatchObject({
      level: 'error',
      event: 'room_full_state_failed',
      phase: 'serialize',
      guestId: 'guest-full-state',
      sessionId: 'session-full-state',
      roomId: 'town:base:1',
      mapId: 'town',
      errorMessage: 'full state encode exploded'
    });
  });
});
