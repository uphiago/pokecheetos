import { runtimeConfig } from '@pokecheetos/config';

type RoomKind = 'base' | 'overflow';

type RoomState = {
  roomId: string;
  mapId: string;
  kind: RoomKind;
  occupants: Set<string>;
  reservedGuestIds: Map<string, number>;
};

export type RoomAllocation = {
  roomId: string;
  mapId: string;
  created: boolean;
  kind: RoomKind;
};

export type RoomAllocationRecord = {
  roomId: string;
  mapId: string;
  kind: RoomKind;
  occupants: number;
  reservedGuestIds: string[];
};

export type RoomAllocationService = ReturnType<typeof createRoomAllocationService>;

type RoomAllocationServiceConfig = {
  roomCapacity?: number;
  reconnectWindowMs?: number;
  baseRoomCountPerMap?: number;
  now?: () => number;
};

export function createRoomAllocationService(config: RoomAllocationServiceConfig = {}) {
  const roomCapacity = config.roomCapacity ?? runtimeConfig.roomCapacity;
  const reconnectWindowMs = config.reconnectWindowMs ?? runtimeConfig.reconnectWindowMs;
  const baseRoomCountPerMap = config.baseRoomCountPerMap ?? runtimeConfig.baseRoomCountPerMap;
  const now = config.now ?? Date.now;
  const roomsByMap = new Map<string, RoomState[]>();

  function cleanupExpiredReservations(mapId?: string): void {
    const targetMaps = mapId ? [mapId] : [...roomsByMap.keys()];
    const currentTime = now();

    for (const targetMapId of targetMaps) {
      const rooms = roomsByMap.get(targetMapId);
      if (!rooms) {
        continue;
      }

      for (const room of [...rooms]) {
        for (const [guestId, expiresAt] of room.reservedGuestIds.entries()) {
          if (expiresAt <= currentTime) {
            room.reservedGuestIds.delete(guestId);
          }
        }
      }

      pruneEmptyOverflowRooms(targetMapId);
    }
  }

  function ensureBaseRooms(mapId: string): RoomState[] {
    const existing = roomsByMap.get(mapId) ?? [];
    const rooms = [...existing];

    for (let index = 1; index <= baseRoomCountPerMap; index += 1) {
      const roomId = `${mapId}:base:${index}`;
      if (!rooms.some((room) => room.roomId === roomId)) {
        rooms.push(createRoomState(mapId, 'base', index));
      }
    }

    sortRooms(rooms);
    roomsByMap.set(mapId, rooms);
    return rooms;
  }

  function createRoomState(mapId: string, kind: RoomKind, index: number): RoomState {
    return {
      roomId: `${mapId}:${kind}:${index}`,
      mapId,
      kind,
      occupants: new Set<string>(),
      reservedGuestIds: new Map<string, number>()
    };
  }

  function sortRooms(rooms: RoomState[]): void {
    rooms.sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'base' ? -1 : 1;
      }

      const leftIndex = Number.parseInt(left.roomId.split(':').at(-1) ?? '0', 10);
      const rightIndex = Number.parseInt(right.roomId.split(':').at(-1) ?? '0', 10);
      return leftIndex - rightIndex;
    });
  }

  function findRoom(roomId: string): RoomState | undefined {
    for (const rooms of roomsByMap.values()) {
      const room = rooms.find((candidate) => candidate.roomId === roomId);
      if (room) {
        return room;
      }
    }

    return undefined;
  }

  function hasCapacity(room: RoomState): boolean {
    return room.occupants.size + room.reservedGuestIds.size < roomCapacity;
  }

  function nextOverflowIndex(mapId: string): number {
    const rooms = roomsByMap.get(mapId) ?? [];
    const usedIndexes = rooms
      .filter((room) => room.kind === 'overflow')
      .map((room) => Number.parseInt(room.roomId.split(':').at(-1) ?? '0', 10))
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right);

    let nextIndex = 1;
    for (const usedIndex of usedIndexes) {
      if (usedIndex !== nextIndex) {
        break;
      }
      nextIndex += 1;
    }

    return nextIndex;
  }

  function pruneEmptyOverflowRooms(mapId: string): void {
    const rooms = roomsByMap.get(mapId);
    if (!rooms) {
      return;
    }

    const remainingRooms = rooms.filter((room) => {
      if (room.kind === 'base') {
        return true;
      }

      return room.occupants.size > 0 || room.reservedGuestIds.size > 0;
    });

    roomsByMap.set(mapId, remainingRooms);
  }

  return {
    allocate(mapId: string, guestId?: string): RoomAllocation {
      cleanupExpiredReservations(mapId);
      const existingRoomIds = new Set((roomsByMap.get(mapId) ?? []).map((room) => room.roomId));
      const rooms = ensureBaseRooms(mapId);

      const existingRoom = guestId
        ? rooms.find((room) => room.occupants.has(guestId))
        : undefined;
      if (existingRoom) {
        return {
          roomId: existingRoom.roomId,
          mapId,
          created: false,
          kind: existingRoom.kind
        };
      }

      const availableRoom = rooms.find(hasCapacity);
      if (availableRoom) {
        if (guestId) {
          availableRoom.occupants.add(guestId);
        }

        return {
          roomId: availableRoom.roomId,
          mapId,
          created: !existingRoomIds.has(availableRoom.roomId),
          kind: availableRoom.kind
        };
      }

      const overflowRoom = createRoomState(mapId, 'overflow', nextOverflowIndex(mapId));
      if (guestId) {
        overflowRoom.occupants.add(guestId);
      }

      rooms.push(overflowRoom);
      sortRooms(rooms);

      return {
        roomId: overflowRoom.roomId,
        mapId,
        created: true,
        kind: overflowRoom.kind
      };
    },

    reserveForReconnect(input: { guestId: string; roomId: string; mapId: string }): void {
      cleanupExpiredReservations(input.mapId);
      const room = findRoom(input.roomId);
      if (!room || room.mapId !== input.mapId) {
        return;
      }

      room.reservedGuestIds.set(input.guestId, now() + reconnectWindowMs);
    },

    reconnect(mapId: string, guestId: string): { roomId: string; mapId: string; reusedReservation: boolean } | null {
      cleanupExpiredReservations(mapId);
      const rooms = ensureBaseRooms(mapId);
      const reservedRoom = rooms.find((room) => room.reservedGuestIds.has(guestId));

      if (!reservedRoom) {
        return null;
      }

      reservedRoom.reservedGuestIds.delete(guestId);
      reservedRoom.occupants.add(guestId);

      return {
        roomId: reservedRoom.roomId,
        mapId,
        reusedReservation: true
      };
    },

    release(input: { roomId: string; guestId?: string }): { removedRoom: boolean } {
      const room = findRoom(input.roomId);
      if (!room) {
        return { removedRoom: false };
      }

      if (input.guestId) {
        room.occupants.delete(input.guestId);
      } else {
        const firstGuestId = room.occupants.values().next().value;
        if (firstGuestId) {
          room.occupants.delete(firstGuestId);
        }
      }

      cleanupExpiredReservations(room.mapId);
      const removedRoom = room.kind === 'overflow' && room.occupants.size === 0 && room.reservedGuestIds.size === 0;
      if (removedRoom) {
        pruneEmptyOverflowRooms(room.mapId);
      }

      return { removedRoom };
    },

    getRooms(mapId: string): RoomAllocationRecord[] {
      cleanupExpiredReservations(mapId);
      return ensureBaseRooms(mapId).map((room) => ({
        roomId: room.roomId,
        mapId: room.mapId,
        kind: room.kind,
        occupants: room.occupants.size,
        reservedGuestIds: [...room.reservedGuestIds.keys()].sort()
      }));
    }
  };
}
