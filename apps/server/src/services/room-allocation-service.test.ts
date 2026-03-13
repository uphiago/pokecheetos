import { describe, expect, it } from 'vitest';
import { createRoomAllocationService } from './room-allocation-service';

describe('room allocation service', () => {
  it('creates a stable base room for the first guest on a map', () => {
    const service = createRoomAllocationService({ roomCapacity: 2 });

    const allocation = service.allocate('town', 'guest-1');

    expect(allocation).toEqual({
      roomId: 'town:base:1',
      mapId: 'town',
      created: true,
      kind: 'base'
    });
    expect(service.getRooms('town')).toEqual([
      {
        roomId: 'town:base:1',
        mapId: 'town',
        kind: 'base',
        occupants: 1,
        reservedGuestIds: []
      }
    ]);
  });

  it('fills the first room with capacity before creating overflow rooms', () => {
    const service = createRoomAllocationService({ roomCapacity: 2 });

    expect(service.allocate('town', 'guest-1').roomId).toBe('town:base:1');
    expect(service.allocate('town', 'guest-2')).toEqual({
      roomId: 'town:base:1',
      mapId: 'town',
      created: false,
      kind: 'base'
    });
    expect(service.allocate('town', 'guest-3')).toEqual({
      roomId: 'town:overflow:1',
      mapId: 'town',
      created: true,
      kind: 'overflow'
    });
    expect(service.allocate('town', 'guest-4')).toEqual({
      roomId: 'town:overflow:1',
      mapId: 'town',
      created: false,
      kind: 'overflow'
    });
  });

  it('reuses a reconnect reservation before falling back to normal allocation', () => {
    let now = 0;
    const service = createRoomAllocationService({
      roomCapacity: 1,
      reconnectWindowMs: 1_000,
      now: () => now
    });

    service.allocate('town', 'guest-1');
    const overflow = service.allocate('town', 'guest-2');

    service.reserveForReconnect({
      guestId: 'guest-2',
      roomId: overflow.roomId,
      mapId: overflow.mapId
    });

    expect(service.release({ roomId: overflow.roomId, guestId: 'guest-2' })).toEqual({
      removedRoom: false
    });
    expect(service.reconnect('town', 'guest-2')).toEqual({
      roomId: 'town:overflow:1',
      mapId: 'town',
      reusedReservation: true
    });
  });

  it('drops expired reconnect reservations and tears down empty overflow rooms', () => {
    let now = 0;
    const service = createRoomAllocationService({
      roomCapacity: 1,
      reconnectWindowMs: 1_000,
      now: () => now
    });

    service.allocate('town', 'guest-1');
    const overflow = service.allocate('town', 'guest-2');

    service.reserveForReconnect({
      guestId: 'guest-2',
      roomId: overflow.roomId,
      mapId: overflow.mapId
    });
    service.release({ roomId: overflow.roomId, guestId: 'guest-2' });

    now = 1_500;

    expect(service.reconnect('town', 'guest-2')).toBeNull();
    expect(service.getRooms('town')).toEqual([
      {
        roomId: 'town:base:1',
        mapId: 'town',
        kind: 'base',
        occupants: 1,
        reservedGuestIds: []
      }
    ]);
  });

  it('keeps the base room alive after the last guest leaves', () => {
    const service = createRoomAllocationService({ roomCapacity: 1 });

    service.allocate('town', 'guest-1');

    expect(service.release({ roomId: 'town:base:1', guestId: 'guest-1' })).toEqual({
      removedRoom: false
    });
    expect(service.getRooms('town')).toEqual([
      {
        roomId: 'town:base:1',
        mapId: 'town',
        kind: 'base',
        occupants: 0,
        reservedGuestIds: []
      }
    ]);
  });

  it('prefers lower-numbered overflow rooms when multiple have space', () => {
    const service = createRoomAllocationService({ roomCapacity: 2 });

    for (let index = 1; index <= 22; index += 1) {
      service.allocate('town', `guest-${index}`);
    }

    service.release({ roomId: 'town:overflow:2', guestId: 'guest-5' });
    service.release({ roomId: 'town:overflow:10', guestId: 'guest-21' });

    expect(service.allocate('town', 'guest-23')).toEqual({
      roomId: 'town:overflow:2',
      mapId: 'town',
      created: false,
      kind: 'overflow'
    });
  });

  it('returns the first available room hint during map transitions', () => {
    const service = createRoomAllocationService({ roomCapacity: 2 });

    service.allocate('town', 'guest-1');
    service.allocate('town', 'guest-2');
    service.allocate('town', 'guest-3');
    service.allocate('town', 'guest-4');
    service.allocate('town', 'guest-5');

    expect(service.allocate('town')).toEqual({
      roomId: 'town:overflow:2',
      mapId: 'town',
      created: false,
      kind: 'overflow'
    });
  });

  it('creates a new overflow room hint when every room is full during transitions', () => {
    const service = createRoomAllocationService({ roomCapacity: 2 });

    service.allocate('town', 'guest-1');
    service.allocate('town', 'guest-2');
    service.allocate('town', 'guest-3');
    service.allocate('town', 'guest-4');

    expect(service.allocate('town')).toEqual({
      roomId: 'town:overflow:2',
      mapId: 'town',
      created: true,
      kind: 'overflow'
    });
  });
});
