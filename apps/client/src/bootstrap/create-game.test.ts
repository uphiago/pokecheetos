import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGame } from './create-game.ts';

describe('createGame', () => {
  it('bootstraps the session, connects the room once, creates the ui shell, and starts Phaser', async () => {
    const scenes = [{ key: 'BootScene' }];
    const fakeGame = { destroy() {} };
    const order: string[] = [];
    const createUiShellBridgeCalls: Array<string | HTMLElement> = [];
    const bootstrapIdentity = {
      guestId: 'guest-1',
      guestToken: 'token-1',
      displayName: 'Trainer 1',
      mapId: 'town',
      tileX: 4,
      tileY: 7,
      roomIdHint: 'town:base:1'
    } as const;
    const room = {
      roomId: 'town:base:1',
      async leave() {}
    };
    let bootstrapCalls = 0;
    let connectCalls = 0;
    const uiShellBridge = {
      showBooting() {
        order.push('ui:booting');
      },
      showConnected(input: { session: typeof bootstrapIdentity; room: typeof room }) {
        order.push(`ui:connected:${input.session.guestId}:${input.room.roomId}`);
      },
      showError(message: string) {
        order.push(`ui:error:${message}`);
      }
    };

    const result = await createGame({
      parent: 'app',
      rendererType: 777,
      scenes,
      createUiShellBridge(parent) {
        createUiShellBridgeCalls.push(parent);
        return uiShellBridge;
      },
      sessionClient: {
        async bootstrapStoredGuest() {
          bootstrapCalls += 1;
          order.push('session:bootstrap');
          return { ...bootstrapIdentity };
        }
      },
      roomConnectionManager: {
        async connect(identity) {
          connectCalls += 1;
          order.push(`room:connect:${identity.guestToken}`);
          return room;
        }
      },
      gameFactory: (config) => {
        order.push('game:create');
        assert.equal(config.parent, 'app');
        assert.deepEqual(config.scene, scenes);
        return fakeGame;
      }
    });

    assert.equal(result.game, fakeGame);
    assert.equal(result.room, room);
    assert.equal(result.session.guestId, 'guest-1');
    assert.equal(bootstrapCalls, 1);
    assert.equal(connectCalls, 1);
    assert.deepEqual(createUiShellBridgeCalls, ['app']);
    assert.deepEqual(order, [
      'ui:booting',
      'session:bootstrap',
      'room:connect:token-1',
      'ui:connected:guest-1:town:base:1',
      'game:create'
    ]);
  });

  it('reports bootstrap failures to the ui shell before rethrowing the error', async () => {
    const order: string[] = [];
    const expectedError = new Error('bootstrap unavailable');

    await assert.rejects(
      () =>
        createGame({
          parent: 'app',
          sessionClient: {
            async bootstrapStoredGuest() {
              order.push('session:bootstrap');
              throw expectedError;
            }
          },
          roomConnectionManager: {
            async connect() {
              order.push('room:connect');
              throw new Error('should not connect');
            }
          },
          uiShellBridge: {
            showBooting() {
              order.push('ui:booting');
            },
            showConnected() {
              order.push('ui:connected');
            },
            showError(message: string) {
              order.push(`ui:error:${message}`);
            }
          },
          gameFactory: () => {
            order.push('game:create');
            return { destroy() {} };
          }
        }),
      expectedError
    );

    assert.deepEqual(order, [
      'ui:booting',
      'session:bootstrap',
      'ui:error:bootstrap unavailable'
    ]);
  });
});
