import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerGuestBootstrapRoute } from './guest-bootstrap';

describe('guest bootstrap route', () => {
  it('creates a new guest when no token is provided', async () => {
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
    const app = Fastify();
    await registerGuestBootstrapRoute(app, {
      bootstrapGuest: () => {
        throw new Error('db down');
      }
    });

    const response = await app.inject({ method: 'POST', url: '/api/session/guest', payload: {} });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ code: 'bootstrap_failed', message: 'Failed to bootstrap guest session' });
  });
});
