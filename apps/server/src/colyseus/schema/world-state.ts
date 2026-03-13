import { MapSchema, Schema, defineTypes } from '@colyseus/schema';
import { PlayerState } from './player-state';

export class WorldState extends Schema {
  mapId = '';
  roomId = '';
  players = new MapSchema<PlayerState>();
}

defineTypes(WorldState, {
  mapId: 'string',
  roomId: 'string',
  players: { map: PlayerState }
});
