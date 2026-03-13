import { Schema, defineTypes } from '@colyseus/schema';
import type { Direction } from '@pokecheetos/shared';

export class PlayerState extends Schema {
  guestId = '';
  displayName = '';
  mapId = '';
  tileX = 0;
  tileY = 0;
  direction: Direction = 'down';
}

defineTypes(PlayerState, {
  guestId: 'string',
  displayName: 'string',
  mapId: 'string',
  tileX: 'number',
  tileY: 'number',
  direction: 'string'
});
