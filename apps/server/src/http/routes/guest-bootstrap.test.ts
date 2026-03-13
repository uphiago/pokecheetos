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
    });

    const response = await app.inject({ method: 'POST', url: '/api/session/guest', payload: {} });
    expect(response.statusCode).toBe(200);
    expect(response.json().guestId).toBe('g1');
    expect(response.json().requestId).toBeTruthy();
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(logSpy.mock.calls[0]?.[0]))).toMatchObject({
      level: 'info',
      message: 'guest bootstrap success',
      event: 'guest_bootstrap_succeeded',
      phase: 'bootstrap',
      guestId: 'g1',
      mapId: 'town',
      roomId: 'town:base:1',
      hasGuestToken: false
    });
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
    await registerGuestBootstrapRoute(app, {
      bootstrapGuest: () => {
        throw new Error('db down');
      }
    });

    const response = await app.inject({ method: 'POST', url: '/api/session/guest', payload: {} });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ code: 'bootstrap_failed', message: 'Failed to bootstrap guest session' });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0]))).toMatchObject({
      level: 'error',
      message: 'guest bootstrap failed',
      event: 'guest_bootstrap_failed',
      phase: 'bootstrap',
      hasGuestToken: false,
      errorName: 'Error',
      errorMessage: 'db down'
    });
  });
});
