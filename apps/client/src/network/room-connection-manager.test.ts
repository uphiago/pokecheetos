import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { RoomConnectionManager } from './room-connection-manager.ts';

describe('RoomConnectionManager', () => {
  const bootstrapIdentity = {
    guestId: 'guest-1',
    guestToken: 'token-1',
    displayName: 'Trainer 1',
    mapId: 'town',
    tileX: 4,
    tileY: 7,
    roomIdHint: 'town:base:1'
  } as const;

  it('retries a failed join with the same issued bootstrap identity', async () => {
    const joinCalls: Array<Record<string, unknown>> = [];
    const room = {
      roomId: 'town:base:1',
      async leave() {}
    };
    const manager = new RoomConnectionManager({
      roomClient: {
        async joinWorld(options) {
          joinCalls.push({ ...options });
          if (joinCalls.length === 1) {
            throw new Error('temporary join failure');
          }

          return room;
        }
      }
    });

    const connectedRoom = await manager.connect({ ...bootstrapIdentity });

    assert.equal(connectedRoom, room);
    assert.equal(joinCalls.length, 2);
    assert.deepEqual(joinCalls[0], bootstrapIdentity);
    assert.deepEqual(joinCalls[1], bootstrapIdentity);
    assert.equal(manager.getActiveRoom(), room);
  });

  it('reuses the active room when connect is called again with the same identity', async () => {
    let joinCalls = 0;
    const room = {
      roomId: 'town:base:1',
      async leave() {}
    };
    const manager = new RoomConnectionManager({
      roomClient: {
        async joinWorld() {
          joinCalls += 1;
          return room;
        }
      }
    });

    const firstRoom = await manager.connect({ ...bootstrapIdentity });
    const secondRoom = await manager.connect({ ...bootstrapIdentity });

    assert.equal(firstRoom, room);
    assert.equal(secondRoom, room);
    assert.equal(joinCalls, 1);
  });

  it('disconnects the previous room before joining a different hinted room', async () => {
    let leaveCalls = 0;
    let joinCalls = 0;
    const manager = new RoomConnectionManager({
      roomClient: {
        async joinWorld(options) {
          joinCalls += 1;
          return {
            roomId: String(options.roomIdHint),
            async leave(consented?: boolean) {
              leaveCalls += 1;
              assert.equal(consented, true);
            }
          };
        }
      }
    });

    const firstRoom = await manager.connect({ ...bootstrapIdentity });
    const secondRoom = await manager.connect({
      ...bootstrapIdentity,
      roomIdHint: 'town:overflow:2'
    });

    assert.equal(firstRoom.roomId, 'town:base:1');
    assert.equal(secondRoom.roomId, 'town:overflow:2');
    assert.equal(joinCalls, 2);
    assert.equal(leaveCalls, 1);
  });

  it('prefers the same room id as reconnect hint after a connection drop', async () => {
    const joinCalls: Array<Record<string, unknown>> = [];
    const manager = new RoomConnectionManager({
      roomClient: {
        async joinWorld(options) {
          joinCalls.push({ ...options });
          if (joinCalls.length === 1) {
            return {
              roomId: 'town:overflow:2',
              async leave() {}
            };
          }

          return {
            roomId: 'town:overflow:2',
            async leave() {}
          };
        }
      }
    });

    await manager.connect({ ...bootstrapIdentity });
    manager.noteConnectionDrop();
    await manager.reconnect();

    assert.deepEqual(joinCalls[0], bootstrapIdentity);
    assert.deepEqual(joinCalls[1], {
      ...bootstrapIdentity,
      roomIdHint: 'town:overflow:2'
    });
  });

  it('switches rooms using transition payloads and clears local state on disconnect', async () => {
    let leaveCalls = 0;
    const manager = new RoomConnectionManager({
      roomClient: {
        async joinWorld(options) {
          return {
            roomId: String(options.roomIdHint),
            async leave(consented?: boolean) {
              leaveCalls += 1;
              assert.equal(consented, true);
            }
          };
        }
      }
    });

    await manager.connect({ ...bootstrapIdentity });
    const transitionedRoom = await manager.transitionTo({
      type: 'map_transition',
      mapId: 'route-1',
      roomIdHint: 'route-1:base:1'
    });

    assert.equal(transitionedRoom.roomId, 'route-1:base:1');
    await manager.disconnect();
    await manager.disconnect();

    assert.equal(leaveCalls, 2);
    assert.equal(manager.getActiveRoom(), null);
  });
});
