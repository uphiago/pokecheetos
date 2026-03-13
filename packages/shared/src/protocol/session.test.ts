import { describe, expect, it } from 'vitest';
import type { GuestBootstrapRequest, GuestBootstrapResponse } from './session';

describe('session protocol', () => {
  it('accepts optional guest token request', () => {
    const payload: GuestBootstrapRequest = { guestToken: 'abc' };
    expect(payload.guestToken).toBe('abc');
  });

  it('matches bootstrap response shape', () => {
    const response: GuestBootstrapResponse = {
      guestId: 'g1',
      guestToken: 't1',
      displayName: 'Trainer1',
      mapId: 'town',
      tileX: 5,
      tileY: 7,
      roomIdHint: 'town:base:1'
    };

    expect(response.displayName).toBe('Trainer1');
    expect(response.roomIdHint).toContain('town');
  });
});
