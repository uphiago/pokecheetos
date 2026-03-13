import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  hasClientBootstrapErrorReport,
  mapClientBootstrapError,
  markClientBootstrapErrorReported,
  reportClientBootstrapError
} from './client-error-mapper.ts';
import { SessionBootstrapError } from '../session/session-client.ts';

describe('client-error-mapper', () => {
  it('maps bootstrap API failures to BOOTSTRAP_FAILED', () => {
    const mapped = mapClientBootstrapError(
      new SessionBootstrapError(503, 'bootstrap_failed', 'temporary outage')
    );

    assert.equal(mapped.code, 'BOOTSTRAP_FAILED');
    assert.equal(mapped.userMessage, 'Could not start a guest session. Check the server and try again.');
    assert.equal(mapped.technicalMessage, 'Bootstrap request failed with status 503 and code bootstrap_failed');
  });

  it('maps fetch failures to NETWORK_FETCH_FAILED', () => {
    const mapped = mapClientBootstrapError(new TypeError('Failed to fetch'));

    assert.equal(mapped.code, 'NETWORK_FETCH_FAILED');
  });

  it('maps explicit browser CORS failures to CORS_BLOCKED', () => {
    const mapped = mapClientBootstrapError(
      new Error('Access to fetch at http://localhost:3001/api/session/guest has been blocked by CORS policy')
    );

    assert.equal(mapped.code, 'CORS_BLOCKED');
  });

  it('maps seat reservation expiry failures to SEAT_RESERVATION_EXPIRED', () => {
    const mapped = mapClientBootstrapError(new Error('seat reservation expired before join'));

    assert.equal(mapped.code, 'SEAT_RESERVATION_EXPIRED');
  });

  it('maps room join failures to ROOM_CONNECT_FAILED', () => {
    const mapped = mapClientBootstrapError(new Error('temporary join failure for room world'));

    assert.equal(mapped.code, 'ROOM_CONNECT_FAILED');
  });

  it('does not treat generic connection-refused errors as room join failures', () => {
    const mapped = mapClientBootstrapError(new Error('connect ECONNREFUSED 127.0.0.1:3001'));

    assert.equal(mapped.code, 'UNKNOWN');
  });

  it('falls back to UNKNOWN when the error shape is not recognized', () => {
    const mapped = mapClientBootstrapError({ weird: true });

    assert.equal(mapped.code, 'UNKNOWN');
  });

  it('reports a structured bootstrap error payload to the console sink', () => {
    const calls: unknown[] = [];
    const mapped = mapClientBootstrapError(
      new SessionBootstrapError(500, 'bootstrap_failed', 'server down')
    );

    reportClientBootstrapError(mapped, {
      error(payload) {
        calls.push(payload);
      }
    });

    assert.deepEqual(calls, [
      {
        phase: 'bootstrap',
        code: 'BOOTSTRAP_FAILED',
        userMessage: 'Could not start a guest session. Check the server and try again.',
        technicalMessage: 'Bootstrap request failed with status 500 and code bootstrap_failed',
        cause: mapped.cause,
        causeName: 'SessionBootstrapError',
        causeMessage: 'server down',
        status: 500
      }
    ]);
  });

  it('can mark an error object after it has been reported', () => {
    const error = new Error('boom');

    assert.equal(hasClientBootstrapErrorReport(error), false);
    markClientBootstrapErrorReported(error);
    assert.equal(hasClientBootstrapErrorReport(error), true);
  });
});
