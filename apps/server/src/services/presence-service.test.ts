import { describe, expect, it } from 'vitest';
import { createPresenceService } from './presence-service';

describe('presence service', () => {
  it('stores the first active connection for a guest', () => {
    const service = createPresenceService();

    const result = service.register({
      connectionId: 'conn-1',
      guestId: 'guest-1',
      roomId: 'town:base:1'
    });

    expect(result.accepted).toEqual({
      connectionId: 'conn-1',
      guestId: 'guest-1',
      roomId: 'town:base:1'
    });
    expect(result.displaced).toBeUndefined();
    expect(service.getByGuestId('guest-1')).toEqual(result.accepted);
    expect(service.getByConnectionId('conn-1')).toEqual(result.accepted);
  });

  it('replaces the older connection when the same guest reconnects', () => {
    const service = createPresenceService();

    service.register({
      connectionId: 'conn-1',
      guestId: 'guest-1',
      roomId: 'town:base:1'
    });

    const result = service.register({
      connectionId: 'conn-2',
      guestId: 'guest-1',
      roomId: 'town:overflow:1'
    });

    expect(result.accepted.connectionId).toBe('conn-2');
    expect(result.displaced).toEqual({
      connectionId: 'conn-1',
      guestId: 'guest-1',
      roomId: 'town:base:1'
    });
    expect(service.getByGuestId('guest-1')).toEqual(result.accepted);
    expect(service.getByConnectionId('conn-1')).toBeUndefined();
    expect(service.getByConnectionId('conn-2')).toEqual(result.accepted);
  });

  it('tracks different guests independently', () => {
    const service = createPresenceService();

    service.register({
      connectionId: 'conn-1',
      guestId: 'guest-1',
      roomId: 'town:base:1'
    });
    service.register({
      connectionId: 'conn-2',
      guestId: 'guest-2',
      roomId: 'route-1:base:1'
    });

    expect(service.getByGuestId('guest-1')?.connectionId).toBe('conn-1');
    expect(service.getByGuestId('guest-2')?.connectionId).toBe('conn-2');
  });

  it('unregisters only the active connection', () => {
    const service = createPresenceService();

    service.register({
      connectionId: 'conn-1',
      guestId: 'guest-1',
      roomId: 'town:base:1'
    });
    service.register({
      connectionId: 'conn-2',
      guestId: 'guest-1',
      roomId: 'town:overflow:1'
    });

    service.unregister('conn-1');
    expect(service.getByGuestId('guest-1')?.connectionId).toBe('conn-2');

    service.unregister('conn-2');
    expect(service.getByGuestId('guest-1')).toBeUndefined();
    expect(service.getByConnectionId('conn-2')).toBeUndefined();
  });
});
