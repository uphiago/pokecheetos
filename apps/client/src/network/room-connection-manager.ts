import type { GuestBootstrapResponse, MapTransitionEvent } from '@pokecheetos/shared';
import type { JoinWorldOptions, RoomLike } from './room-client.ts';

export type { RoomLike } from './room-client.ts';

export type RoomClientLike<TRoom extends RoomLike = RoomLike> = {
  joinWorld(options: JoinWorldOptions): Promise<TRoom>;
};

export type RoomConnectionManagerOptions<TRoom extends RoomLike = RoomLike> = {
  roomClient: RoomClientLike<TRoom>;
};

export class RoomConnectionManager<TRoom extends RoomLike = RoomLike> {
  readonly #roomClient: RoomClientLike<TRoom>;
  #activeRoom: TRoom | null = null;
  #identity: GuestBootstrapResponse | null = null;
  #requestedIdentityKey: string | null = null;
  #sameRoomReconnectHint: string | null = null;

  constructor(options: RoomConnectionManagerOptions<TRoom>) {
    this.#roomClient = options.roomClient;
  }

  getActiveRoom() {
    return this.#activeRoom;
  }

  async connect(identity: GuestBootstrapResponse): Promise<TRoom> {
    const requestedIdentityKey = JSON.stringify(identity);
    if (this.#activeRoom && this.#requestedIdentityKey === requestedIdentityKey) {
      return this.#activeRoom;
    }

    if (this.#activeRoom) {
      await this.disconnect();
    }

    this.#identity = { ...identity };
    this.#requestedIdentityKey = requestedIdentityKey;
    return this.#connectWithRetry([this.#identity.roomIdHint, this.#identity.roomIdHint]);
  }

  noteConnectionDrop(): void {
    this.#sameRoomReconnectHint = this.#activeRoom?.roomId ?? this.#sameRoomReconnectHint;
    this.#activeRoom = null;
  }

  async reconnect(): Promise<TRoom> {
    if (!this.#identity) {
      throw new Error('Cannot reconnect before an identity has been bootstrapped');
    }

    const hints = this.#sameRoomReconnectHint
      ? [this.#sameRoomReconnectHint, this.#identity.roomIdHint]
      : [this.#identity.roomIdHint, this.#identity.roomIdHint];

    return this.#connectWithRetry(hints);
  }

  async transitionTo(event: MapTransitionEvent): Promise<TRoom> {
    if (!this.#identity) {
      throw new Error('Cannot transition rooms before an identity has been bootstrapped');
    }

    await this.disconnect();
    this.#identity = {
      ...this.#identity,
      mapId: event.mapId,
      roomIdHint: event.roomIdHint
    };

    return this.#connectWithRetry([event.roomIdHint, event.roomIdHint]);
  }

  async disconnect() {
    if (!this.#activeRoom) {
      return;
    }

    const room = this.#activeRoom;
    this.#activeRoom = null;
    await room.leave(true);
  }

  async #connectWithRetry(roomIdHints: string[]): Promise<TRoom> {
    if (!this.#identity) {
      throw new Error('Cannot connect without a bootstrapped identity');
    }

    const uniqueHints = roomIdHints.filter(
      (hint, index) => roomIdHints.indexOf(hint) === index || index === roomIdHints.length - 1
    );
    let lastError: unknown;

    for (const roomIdHint of uniqueHints) {
      try {
        const room = await this.#roomClient.joinWorld({
          ...this.#identity,
          roomIdHint
        });

        this.#activeRoom = room;
        this.#sameRoomReconnectHint = room.roomId ?? roomIdHint;
        this.#identity = {
          ...this.#identity,
          roomIdHint: this.#sameRoomReconnectHint
        };
        return room;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error('Failed to connect room');
  }
}
