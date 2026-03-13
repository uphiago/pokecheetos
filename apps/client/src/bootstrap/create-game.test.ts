import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { SessionBootstrapError } from '../session/session-client.ts';
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
      showError(input: { diagnostics: { code: string } }) {
        order.push(`ui:error:${input.diagnostics.code}`);
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

  it('keeps bootstrap failures inline until the recovery action retries successfully', async () => {
    const order: string[] = [];
    const logCalls: unknown[][] = [];
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
    let diagnosticsInput:
      | {
          diagnostics: {
            code: string;
            phase: string;
            message: string;
            retryable: boolean;
            status?: number;
          };
          recovery?: {
            label: string;
            run(): void;
          };
        }
      | undefined;

    const promise = createGame({
      parent: 'app',
      sessionClient: {
        async bootstrapStoredGuest() {
          bootstrapCalls += 1;
          order.push(`session:bootstrap:${bootstrapCalls}`);
          if (bootstrapCalls === 1) {
            throw new SessionBootstrapError(503, 'bootstrap_failed', 'temporary outage');
          }

          return { ...bootstrapIdentity };
        }
      },
      roomConnectionManager: {
        async connect(identity) {
          order.push(`room:connect:${identity.guestToken}`);
          return room;
        }
      },
      uiShellBridge: {
        showBooting() {
          order.push('ui:booting');
        },
        showConnected(input) {
          order.push(`ui:connected:${input.session.guestId}:${input.room.roomId}`);
        },
        showError(input) {
          diagnosticsInput = input;
          order.push(`ui:error:${input.diagnostics.code}:${input.diagnostics.phase}`);
          input.recovery?.run();
        }
      },
      diagnosticsLogger: {
        error: (...args: unknown[]) => {
          logCalls.push(args);
        }
      },
      gameFactory: () => {
        order.push('game:create');
        return { destroy() {} };
      }
    });

    const result = await promise;

    assert.equal(result.room, room);
    assert.equal(diagnosticsInput?.diagnostics.code, 'BOOTSTRAP_FAILED');
    assert.equal(diagnosticsInput?.diagnostics.phase, 'bootstrap');
    assert.equal(diagnosticsInput?.diagnostics.retryable, true);
    assert.equal(diagnosticsInput?.diagnostics.status, 503);
    assert.equal(diagnosticsInput?.recovery?.label, 'Retry connection');
    assert.equal(logCalls[0]?.[0], '[client][bootstrap] BOOTSTRAP_FAILED');
    assert.deepEqual(order, [
      'ui:booting',
      'session:bootstrap:1',
      'ui:error:BOOTSTRAP_FAILED:bootstrap',
      'ui:booting',
      'session:bootstrap:2',
      'room:connect:token-1',
      'ui:connected:guest-1:town:base:1',
      'game:create'
    ]);
  });

  it('surfaces connect diagnostics and waits for recovery instead of failing out to the caller', async () => {
    const order: string[] = [];
    const logCalls: unknown[][] = [];
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
    let connectCalls = 0;
    let diagnosticsInput:
      | {
          diagnostics: {
            code: string;
            phase: string;
            message: string;
            retryable: boolean;
            roomIdHint?: string;
          };
          recovery?: {
            label: string;
            run(): void;
          };
        }
      | undefined;

    const promise = createGame({
      parent: 'app',
      sessionClient: {
        async bootstrapStoredGuest() {
          order.push('session:bootstrap');
          return { ...bootstrapIdentity };
        }
      },
      roomConnectionManager: {
        async connect(identity) {
          connectCalls += 1;
          order.push(`room:connect:${connectCalls}:${identity.roomIdHint}`);
          if (connectCalls === 1) {
            throw new Error('seat reservation expired');
          }

          return room;
        }
      },
      uiShellBridge: {
        showBooting() {
          order.push('ui:booting');
        },
        showConnected(input) {
          order.push(`ui:connected:${input.session.guestId}:${input.room.roomId}`);
        },
        showError(input) {
          diagnosticsInput = input;
          order.push(`ui:error:${input.diagnostics.code}:${input.diagnostics.roomIdHint}`);
          input.recovery?.run();
        }
      },
      diagnosticsLogger: {
        error: (...args: unknown[]) => {
          logCalls.push(args);
        }
      },
      gameFactory: () => {
        order.push('game:create');
        return { destroy() {} };
      }
    });

    await promise;

    assert.equal(diagnosticsInput?.diagnostics.code, 'SEAT_RESERVATION_EXPIRED');
    assert.equal(diagnosticsInput?.diagnostics.phase, 'connect');
    assert.equal(diagnosticsInput?.diagnostics.roomIdHint, 'town:base:1');
    assert.equal(diagnosticsInput?.diagnostics.retryable, true);
    assert.equal(logCalls[0]?.[0], '[client][connect] SEAT_RESERVATION_EXPIRED');
    assert.deepEqual(order, [
      'ui:booting',
      'session:bootstrap',
      'room:connect:1:town:base:1',
      'ui:error:SEAT_RESERVATION_EXPIRED:town:base:1',
      'ui:booting',
      'room:connect:2:town:base:1',
      'ui:connected:guest-1:town:base:1',
      'game:create'
    ]);
  });
});
