import { Room } from 'colyseus';
import { runtimeConfig } from '@pokecheetos/config';
import { WorldState } from '../schema/world-state';

export type WorldRoomOptions = Readonly<{
  mapId: string;
  roomId: string;
  maxClients: number;
}>;

export class WorldRoom extends Room<WorldState> {
  onCreate(options: WorldRoomOptions) {
    this.autoDispose = false;
    this.maxClients = options.maxClients;
    this.patchRate = Math.round(1_000 / runtimeConfig.serverTickRate);
    this.roomId = options.roomId;
    this.setState(
      new WorldState({
        mapId: options.mapId,
        roomId: options.roomId
      })
    );
  }
}
