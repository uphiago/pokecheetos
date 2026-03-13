export const runtimeConfig = {
  serverTickRate: 20,
  roomCapacity: 50,
  reconnectWindowMs: 10_000,
  visibilityWindow: { width: 32, height: 24 },
  interactionDistance: 1,
  baseRoomCountPerMap: 1,
  loadTestPlayers: 50,
  loadTestDurationMs: 120_000
} as const;
