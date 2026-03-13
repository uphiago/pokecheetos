import { Schema, defineTypes } from '@colyseus/schema';
import type { Direction } from '@pokecheetos/shared';

export class PlayerState extends Schema {
  declare guestId: string;
  declare displayName: string;
  declare mapId: string;
  declare tileX: number;
  declare tileY: number;
  declare direction: Direction;

  constructor() {
    super();
    this.guestId = '';
    this.displayName = '';
    this.mapId = '';
    this.tileX = 0;
    this.tileY = 0;
    this.direction = 'down';
  }
}

defineTypes(PlayerState, {
  guestId: 'string',
  displayName: 'string',
  mapId: 'string',
  tileX: 'number',
  tileY: 'number',
  direction: 'string'
});
