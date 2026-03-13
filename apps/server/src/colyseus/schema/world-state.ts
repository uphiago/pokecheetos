import { MapSchema, Schema, defineTypes } from '@colyseus/schema';
import { PlayerState } from './player-state';

export class WorldState extends Schema {
  declare mapId: string;
  declare roomId: string;
  declare players: MapSchema<PlayerState>;

  constructor() {
    super();
    this.mapId = '';
    this.roomId = '';
    this.players = new MapSchema<PlayerState>();
  }
}

defineTypes(WorldState, {
  mapId: 'string',
  roomId: 'string',
  players: { map: PlayerState }
});
