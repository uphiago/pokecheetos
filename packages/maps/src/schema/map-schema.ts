export type AuthoredSpawn = { id: string; tileX: number; tileY: number };

export type AuthoredTransition = {
  tileX: number;
  tileY: number;
  toMapId?: string;
  toSpawnId?: string;
};

export type AuthoredNpc = {
  id: string;
  tileX: number;
  tileY: number;
  facing: 'up' | 'down' | 'left' | 'right';
  blocking: boolean;
  textId?: string;
};

export type AuthoredMap = {
  mapId: string;
  width: number;
  height: number;
  defaultSpawnId?: string;
  blockedTiles: Array<{ tileX: number; tileY: number }>;
  spawns: AuthoredSpawn[];
  transitions: AuthoredTransition[];
  npcs: AuthoredNpc[];
};

export type CompiledMap = {
  mapId: string;
  width: number;
  height: number;
  defaultSpawnId: string;
  blockedTiles: string[];
  spawns: Record<string, { tileX: number; tileY: number }>;
  transitions: Array<{ tileKey: string; toMapId: string; toSpawnId: string }>;
  npcs: Array<{ id: string; tileX: number; tileY: number; facing: 'up' | 'down' | 'left' | 'right'; blocking: boolean; textId: string }>;
};
