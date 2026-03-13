export type TilePosition = {
  tileX: number;
  tileY: number;
};

export type PixelPosition = {
  x: number;
  y: number;
};

export type RemoteInterpolationTarget = {
  authoritative: PixelPosition;
  presented: PixelPosition;
};

export function tileToPixelPosition(position: TilePosition, tileSize: number): PixelPosition {
  return {
    x: position.tileX * tileSize,
    y: position.tileY * tileSize
  };
}

export function createRemoteInterpolationTarget(
  currentPosition: PixelPosition,
  authoritativeTile: TilePosition,
  tileSize: number,
  alpha: number
): RemoteInterpolationTarget {
  const authoritative = tileToPixelPosition(authoritativeTile, tileSize);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));

  return {
    authoritative,
    presented: {
      x: currentPosition.x + (authoritative.x - currentPosition.x) * clampedAlpha,
      y: currentPosition.y + (authoritative.y - currentPosition.y) * clampedAlpha
    }
  };
}
