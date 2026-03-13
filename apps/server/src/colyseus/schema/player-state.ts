import { Schema, defineTypes } from '@colyseus/schema';

export class PlayerState extends Schema {
  guestId = '';
  displayName = '';
  mapId = '';
  tileX = 0;
  tileY = 0;
}

defineTypes(PlayerState, {
  guestId: 'string',
  displayName: 'string',
  mapId: 'string',
  tileX: 'number',
  tileY: 'number'
});
