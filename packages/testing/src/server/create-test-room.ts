export type TestRoom = {
  roomId: string;
  mapId: string;
  capacity: number;
};

export type CreateTestRoomInput = {
  roomId?: string;
  mapId: string;
  capacity?: number;
};

export function createTestRoom(input: CreateTestRoomInput): TestRoom {
  return {
    roomId: input.roomId ?? `test-room-${input.mapId}`,
    mapId: input.mapId,
    capacity: input.capacity ?? 50
  };
}
