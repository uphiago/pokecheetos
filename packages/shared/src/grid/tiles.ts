import type { Direction } from './direction';

export type TilePosition = { tileX: number; tileY: number };

export function applyDirection(position: TilePosition, direction: Direction): TilePosition {
  if (direction === 'up') return { tileX: position.tileX, tileY: position.tileY - 1 };
  if (direction === 'down') return { tileX: position.tileX, tileY: position.tileY + 1 };
  if (direction === 'left') return { tileX: position.tileX - 1, tileY: position.tileY };
  return { tileX: position.tileX + 1, tileY: position.tileY };
}

export function toPixelPosition(position: TilePosition, tileSize: number) {
  return { x: position.tileX * tileSize, y: position.tileY * tileSize };
}
