export type VisibilityWindow = {
  width: number;
  height: number;
};

export function isTileVisible(
  origin: { tileX: number; tileY: number },
  target: { tileX: number; tileY: number },
  window: VisibilityWindow
): boolean {
  const halfWidth = Math.floor(window.width / 2);
  const halfHeight = Math.floor(window.height / 2);

  const minX = origin.tileX - halfWidth;
  const maxX = origin.tileX + halfWidth;
  const minY = origin.tileY - halfHeight;
  const maxY = origin.tileY + halfHeight;

  return target.tileX >= minX && target.tileX <= maxX && target.tileY >= minY && target.tileY <= maxY;
}
