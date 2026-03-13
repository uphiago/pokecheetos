import type { GuestBootstrapResponse, MapTransitionEvent } from '@pokecheetos/shared';
import type { JoinWorldOptions, RoomLike } from './room-client.ts';

export type { RoomLike } from './room-client.ts';
export const DEFAULT_ROOM_JOIN_RETRY_BACKOFF_MS = [150, 400] as const;

export class RoomConnectionError extends Error {
  readonly code = 'room_connect_failed';
  readonly roomIdHint: string;
  readonly attempts: number;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(input: {
    roomIdHint: string;
    attempts: number;
    cause?: unknown;
    retryable?: boolean;
  }) {
    const causeMessage =
      input.cause instanceof Error ? input.cause.message : 'Failed to join world room';
    super(causeMessage);
    this.name = 'RoomConnectionError';
    this.roomIdHint = input.roomIdHint;
    this.attempts = input.attempts;
    this.retryable = input.retryable ?? true;
    this.cause = input.cause;
  }
}

export type RoomClientLike<TRoom extends RoomLike = RoomLike> = {
  joinWorld(options: JoinWorldOptions): Promise<TRoom>;
};

export type RoomConnectionManagerOptions<TRoom extends RoomLike = RoomLike> = {
  roomClient: RoomClientLike<TRoom>;
  retryBackoffMs?: readonly number[];
  wait?: (delayMs: number) => Promise<void>;
};

export class RoomConnectionManager<TRoom extends RoomLike = RoomLike> {
  readonly #roomClient: RoomClientLike<TRoom>;
  readonly #retryBackoffMs: readonly number[];
  readonly #wait: (delayMs: number) => Promise<void>;
  #activeRoom: TRoom | null = null;
  #identity: GuestBootstrapResponse | null = null;
  #requestedIdentityKey: string | null = null;
  #sameRoomReconnectHint: string | null = null;

  constructor(options: RoomConnectionManagerOptions<TRoom>) {
    this.#roomClient = options.roomClient;
    this.#retryBackoffMs = options.retryBackoffMs ?? DEFAULT_ROOM_JOIN_RETRY_BACKOFF_MS;
    this.#wait = options.wait ?? waitForDelay;
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

    const uniqueHints = [...new Set(roomIdHints)];
    let lastError: unknown;

    for (const roomIdHint of uniqueHints) {
      for (let attempt = 0; attempt <= this.#retryBackoffMs.length; attempt += 1) {
        if (attempt > 0) {
          await this.#wait(this.#retryBackoffMs[attempt - 1] ?? 0);
        }

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
          lastError = new RoomConnectionError({
            roomIdHint,
            attempts: attempt + 1,
            cause: error
          });
        }
      }
    }

    throw (
      lastError ??
      new RoomConnectionError({
        roomIdHint: uniqueHints.at(-1) ?? '',
        attempts: 0,
        cause: new Error('No valid room id hints provided')
      })
    );
  }
}

function waitForDelay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
