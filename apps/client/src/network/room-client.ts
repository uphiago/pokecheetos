import { Client } from 'colyseus.js';
import type { GuestBootstrapResponse } from '@pokecheetos/shared';

export type RoomLike = {
  roomId?: string;
  leave(consented?: boolean): Promise<unknown> | void;
};

export type JoinWorldOptions = GuestBootstrapResponse;

export type RoomTransportLike<TRoom extends RoomLike = RoomLike> = {
  joinOrCreate(roomName: string, options?: Record<string, unknown>): Promise<TRoom>;
};

export type RoomClientOptions<TRoom extends RoomLike = RoomLike> = {
  roomName?: string;
  transport: RoomTransportLike<TRoom>;
};

export class RoomClient<TRoom extends RoomLike = RoomLike> {
  readonly #roomName: string;
  readonly #transport: RoomTransportLike<TRoom>;

  constructor(options: RoomClientOptions<TRoom>) {
    this.#roomName = options.roomName ?? 'world';
    this.#transport = options.transport;
  }

  joinWorld(options: JoinWorldOptions): Promise<TRoom> {
    return this.#transport.joinOrCreate(this.#roomName, options);
  }
}

export function createRoomClient(endpoint: string): RoomClient {
  return new RoomClient({
    transport: new Client(endpoint) as unknown as RoomTransportLike
  });
}
