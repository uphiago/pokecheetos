import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { createLogger } from './logger';

describe('logger', () => {
  it('writes info logs as structured JSON', () => {
    const records: string[] = [];
    const logger = createLogger({
      env: 'test',
      infoSink(message) {
        records.push(message);
      }
    });

    logger.info(
      {
        event: 'guest_bootstrap',
        phase: 'bootstrap',
        requestId: 'req-1',
        guestId: 'guest-1',
        roomId: 'town:base:1',
        mapId: 'town'
      },
      'guest bootstrap success'
    );

    assert.deepEqual(JSON.parse(records[0] ?? '{}'), {
      level: 'info',
      message: 'guest bootstrap success',
      event: 'guest_bootstrap',
      phase: 'bootstrap',
      requestId: 'req-1',
      guestId: 'guest-1',
      roomId: 'town:base:1',
      mapId: 'town'
    });
  });

  it('serializes errors with errorCode and dev stack traces', () => {
    const records: string[] = [];
    const logger = createLogger({
      env: 'development',
      errorSink(message) {
        records.push(message);
      }
    });

    logger.error(
      {
        event: 'guest_bootstrap',
        phase: 'bootstrap',
        requestId: 'req-2',
        errorCode: 'BOOTSTRAP_FAILED',
        error: new Error('db down')
      },
      'guest bootstrap failed'
    );

    const payload = JSON.parse(records[0] ?? '{}');
    assert.equal(payload.level, 'error');
    assert.equal(payload.message, 'guest bootstrap failed');
    assert.equal(payload.event, 'guest_bootstrap');
    assert.equal(payload.phase, 'bootstrap');
    assert.equal(payload.requestId, 'req-2');
    assert.equal(payload.errorCode, 'BOOTSTRAP_FAILED');
    assert.equal(payload.errorName, 'Error');
    assert.equal(payload.errorMessage, 'db down');
    assert.match(String(payload.errorStack ?? ''), /db down/);
  });

  it('omits errorStack outside development mode', () => {
    const records: string[] = [];
    const logger = createLogger({
      env: 'production',
      errorSink(message) {
        records.push(message);
      }
    });

    logger.error(
      {
        event: 'guest_bootstrap',
        phase: 'bootstrap',
        requestId: 'req-3',
        errorCode: 'BOOTSTRAP_FAILED',
        error: new Error('db down')
      },
      'guest bootstrap failed'
    );

    const payload = JSON.parse(records[0] ?? '{}');
    assert.equal(payload.errorStack, undefined);
  });

  it('keeps reserved fields authoritative and preserves object throws', () => {
    const records: string[] = [];
    const logger = createLogger({
      env: 'test',
      errorSink(message) {
        records.push(message);
      }
    });

    logger.error(
      {
        level: 'oops',
        message: 'shadowed',
        event: 'guest_bootstrap',
        errorCode: 'BOOTSTRAP_FAILED',
        error: { reason: 'db down', retryable: true }
      },
      'guest bootstrap failed'
    );

    const payload = JSON.parse(records[0] ?? '{}');
    assert.equal(payload.level, 'error');
    assert.equal(payload.message, 'guest bootstrap failed');
    assert.deepEqual(payload.errorDetails, { reason: 'db down', retryable: true });
    assert.equal(payload.errorMessage, '{"reason":"db down","retryable":true}');
  });
});
