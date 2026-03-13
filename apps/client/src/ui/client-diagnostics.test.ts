import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { RoomConnectionError } from '../network/room-connection-manager.ts';
import { SessionBootstrapError } from '../session/session-client.ts';
import { createClientDiagnostics, reportClientDiagnostics } from './client-diagnostics.ts';

describe('createClientDiagnostics', () => {
  it('maps typed bootstrap failures to structured bootstrap diagnostics', () => {
    const diagnostics = createClientDiagnostics(
      new SessionBootstrapError(503, 'bootstrap_failed', 'temporary outage'),
      { phase: 'bootstrap' }
    );

    assert.deepEqual(diagnostics, {
      code: 'BOOTSTRAP_FAILED',
      phase: 'bootstrap',
      message: 'We could not restore your session',
      detail: 'Please try again in a moment.',
      retryable: true,
      status: 503,
      roomIdHint: undefined
    });
  });

  it('preserves typed room join failures and attempt counts', () => {
    const diagnostics = createClientDiagnostics(
      new RoomConnectionError({
        roomIdHint: 'town:base:1',
        attempts: 3,
        cause: new Error('seat reservation expired')
      }),
      { phase: 'connect', roomIdHint: 'ignored' }
    );

    assert.equal(diagnostics.code, 'SEAT_RESERVATION_EXPIRED');
    assert.equal(diagnostics.phase, 'connect');
    assert.equal(diagnostics.retryable, true);
    assert.equal(diagnostics.roomIdHint, 'town:base:1');
    assert.equal(diagnostics.attempts, 3);
    assert.equal(diagnostics.message, 'That room took too long to open');
    assert.equal(diagnostics.detail, 'Retry to request a fresh room seat.');
  });

  it('reports stable debug codes and raw causes to the console logger', () => {
    const logCalls: unknown[][] = [];
    const error = new SessionBootstrapError(503, 'bootstrap_failed', 'temporary outage');
    const diagnostics = createClientDiagnostics(error, { phase: 'bootstrap' });

    reportClientDiagnostics({
      diagnostics,
      error,
      logger: {
        error: (...args: unknown[]) => {
          logCalls.push(args);
        }
      }
    });

    assert.equal(logCalls.length, 1);
    assert.equal(logCalls[0]?.[0], '[client][bootstrap] BOOTSTRAP_FAILED');
    assert.equal(typeof logCalls[0]?.[1], 'object');
    const payload = logCalls[0]?.[1] as Record<string, unknown>;
    assert.equal(payload.code, 'BOOTSTRAP_FAILED');
    assert.equal(payload.phase, 'bootstrap');
    assert.equal(payload.retryable, true);
    assert.equal(payload.status, 503);
    assert.equal(payload.causeMessage, 'temporary outage');
    assert.equal(payload.error, error);
  });
});
