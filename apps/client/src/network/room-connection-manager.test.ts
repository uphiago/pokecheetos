import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RoomConnectionManager } from './room-connection-manager.ts';

describe('RoomConnectionManager', () => {
  it('joins a room and reuses the active connection on subsequent calls', async () => {
    let joinCalls = 0;
    const room = {
      id: 'room-1',
      async leave() {}
    };
    const manager = new RoomConnectionManager({
      roomName: 'world',
      client: {
        async joinOrCreate(roomName, options) {
          joinCalls += 1;
          assert.equal(roomName, 'world');
          assert.deepEqual(options, { roomIdHint: 'town:base:1' });
          return room;
        }
      }
    });

    const firstRoom = await manager.connect({ roomIdHint: 'town:base:1' });
    const secondRoom = await manager.connect({ roomIdHint: 'town:base:1' });

    assert.equal(firstRoom, room);
    assert.equal(secondRoom, room);
    assert.equal(joinCalls, 1);
    assert.equal(manager.getActiveRoom(), room);
  });

  it('reconnects when the requested join options change', async () => {
    let joinCalls = 0;
    let leaveCalls = 0;
    const manager = new RoomConnectionManager({
      roomName: 'world',
      client: {
        async joinOrCreate(_roomName, options) {
          joinCalls += 1;
          return {
            id: `room-${joinCalls}`,
            options,
            async leave() {
              leaveCalls += 1;
            }
          };
        }
      }
    });

    const firstRoom = await manager.connect({ roomIdHint: 'town:base:1' });
    const secondRoom = await manager.connect({ roomIdHint: 'route-1:base:1' });

    assert.notEqual(firstRoom, secondRoom);
    assert.equal(joinCalls, 2);
    assert.equal(leaveCalls, 1);
    assert.equal(manager.getActiveRoom(), secondRoom);
  });

  it('leaves the active room and clears local state on disconnect', async () => {
    let leaveCalls = 0;
    const manager = new RoomConnectionManager({
      roomName: 'world',
      client: {
        async joinOrCreate() {
          return {
            id: 'room-2',
            async leave(consented?: boolean) {
              leaveCalls += 1;
              assert.equal(consented, true);
            }
          };
        }
      }
    });

    await manager.connect({});
    await manager.disconnect();
    await manager.disconnect();

    assert.equal(leaveCalls, 1);
    assert.equal(manager.getActiveRoom(), null);
  });
});
