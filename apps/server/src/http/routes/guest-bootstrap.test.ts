import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { registerGuestBootstrapRoute } from './guest-bootstrap';

describe('guest bootstrap route', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a new guest when no token is provided', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const app = Fastify();
    const infoCalls: Array<Record<string, unknown>> = [];
    await registerGuestBootstrapRoute(app, {
      bootstrapGuest: () => ({
        guestId: 'g1',
        guestToken: 't1',
        displayName: 'Trainer1',
        mapId: 'town',
        tileX: 2,
        tileY: 2,
        roomIdHint: 'town:base:1'
      })
    }, {
      info(context, _message) {
        infoCalls.push(context);
      },
      error(_context, _message) {
        throw new Error('unexpected error log');
      }
    });

    const response = await app.inject({ method: 'POST', url: '/api/session/guest', payload: {} });
    expect(response.statusCode).toBe(200);
    expect(response.json().guestId).toBe('g1');
    expect(infoCalls).toHaveLength(1);
    expect(infoCalls[0]).toMatchObject({
      event: 'guest_bootstrap',
      phase: 'bootstrap',
      guestId: 'g1',
      roomId: 'town:base:1',
      mapId: 'town'
    });
    expect(typeof infoCalls[0]?.requestId).toBe('string');
  });

  it('restores existing guest when token is valid', async () => {
    const app = Fastify();
    await registerGuestBootstrapRoute(app, {
      bootstrapGuest: (payload) => ({
        guestId: 'g-restored',
        guestToken: payload.guestToken ?? 'fallback',
        displayName: 'Trainer9',
        mapId: 'route-1',
        tileX: 5,
        tileY: 6,
        roomIdHint: 'route-1:base:1'
      })
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/session/guest',
      payload: { guestToken: 'known-token' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().guestId).toBe('g-restored');
    expect(response.json().mapId).toBe('route-1');
  });

  it('returns typed bootstrap_failed payload on failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = Fastify();
    const errorCalls: Array<Record<string, unknown>> = [];
    await registerGuestBootstrapRoute(app, {
      bootstrapGuest: () => {
        throw new Error('db down');
      }
    }, {
      info(_context, _message) {
        throw new Error('unexpected info log');
      },
      error(context, _message) {
        errorCalls.push(context);
      }
    });

    const response = await app.inject({ method: 'POST', url: '/api/session/guest', payload: {} });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ code: 'bootstrap_failed', message: 'Failed to bootstrap guest session' });
    expect(errorCalls).toHaveLength(1);
    expect(errorCalls[0]).toMatchObject({
      event: 'guest_bootstrap',
      phase: 'bootstrap',
      errorCode: 'BOOTSTRAP_FAILED'
    });
    expect(errorCalls[0]?.error).toBeInstanceOf(Error);
    expect(typeof errorCalls[0]?.requestId).toBe('string');
  });
});
