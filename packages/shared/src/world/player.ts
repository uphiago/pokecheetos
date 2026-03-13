import type { Direction } from '../grid/direction';

export type PlayerSnapshot = {
  id: string;
  displayName: string;
  mapId: string;
  tileX: number;
  tileY: number;
  direction: Direction;
};

export type LocalPlayerSnapshot = PlayerSnapshot & {
  isLocal: true;
};
