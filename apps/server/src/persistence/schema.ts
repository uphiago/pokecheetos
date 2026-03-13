export type PlayerRecord = {
  guestId: string;
  guestTokenHash: string;
  displayName: string;
  lastMapId: string;
  lastTileX: number;
  lastTileY: number;
  lastDirection: 'up' | 'down' | 'left' | 'right';
  spawnMapId: string;
  spawnTileX: number;
  spawnTileY: number;
  lastSeenAt: string;
  flagsJson: string;
  preferencesJson: string;
  createdAt: string;
  updatedAt: string;
};
