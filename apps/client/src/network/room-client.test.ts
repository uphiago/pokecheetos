import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { RoomClient, RoomJoinError } from './room-client.ts';

describe('RoomClient', () => {
  it('wraps join failures with endpoint and room diagnostics', async () => {
    const expectedCause = new Error('seat reservation expired.');
    const client = new RoomClient({
      endpoint: 'ws://localhost:3001',
      transport: {
        async joinOrCreate() {
          throw expectedCause;
        }
      }
    });

    await assert.rejects(
      () =>
        client.joinWorld({
          guestId: 'guest-1',
          guestToken: 'token-1',
          displayName: 'Trainer 1',
          mapId: 'town',
          tileX: 4,
          tileY: 7,
          roomIdHint: 'town:base:1'
        }),
      (error: unknown) => {
        if (!(error instanceof RoomJoinError)) {
          return false;
        }

        assert.equal(error.code, 'room_connect_failed');
        assert.equal(error.endpoint, 'ws://localhost:3001');
        assert.equal(error.roomName, 'world');
        assert.equal(error.roomIdHint, 'town:base:1');
        assert.equal(error.cause, expectedCause);
        return true;
      }
    );
  });
});
