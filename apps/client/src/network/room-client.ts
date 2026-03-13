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
  endpoint?: string;
  roomName?: string;
  transport: RoomTransportLike<TRoom>;
};

export class RoomJoinError extends Error {
  readonly code = 'room_connect_failed';
  readonly endpoint?: string;
  readonly roomName: string;
  readonly roomIdHint?: string;

  constructor(
    roomName: string,
    options: {
      cause: unknown;
      endpoint?: string;
      roomIdHint?: string;
    }
  ) {
    super(`Failed to join room "${roomName}"`, { cause: options.cause });
    this.name = 'RoomJoinError';
    this.endpoint = options.endpoint;
    this.roomName = roomName;
    this.roomIdHint = options.roomIdHint;
  }
}

export class RoomClient<TRoom extends RoomLike = RoomLike> {
  readonly #endpoint?: string;
  readonly #roomName: string;
  readonly #transport: RoomTransportLike<TRoom>;

  constructor(options: RoomClientOptions<TRoom>) {
    this.#endpoint = options.endpoint;
    this.#roomName = options.roomName ?? 'world';
    this.#transport = options.transport;
  }

  async joinWorld(options: JoinWorldOptions): Promise<TRoom> {
    try {
      return await this.#transport.joinOrCreate(this.#roomName, options);
    } catch (error) {
      throw new RoomJoinError(this.#roomName, {
        cause: error,
        endpoint: this.#endpoint,
        roomIdHint: options.roomIdHint
      });
    }
  }
}

export function createRoomClient(endpoint: string): RoomClient {
  return new RoomClient({
    endpoint,
    transport: new Client(endpoint) as unknown as RoomTransportLike
  });
}
