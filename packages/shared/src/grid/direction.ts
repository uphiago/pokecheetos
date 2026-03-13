export const CARDINAL_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
export type Direction = (typeof CARDINAL_DIRECTIONS)[number];
