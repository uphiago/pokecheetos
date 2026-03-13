export type RoomLike = {
  leave(consented?: boolean): Promise<void> | void;
};

export type RoomClientLike<TRoom extends RoomLike = RoomLike> = {
  joinOrCreate(roomName: string, options?: Record<string, unknown>): Promise<TRoom>;
};

export type RoomConnectionManagerOptions<TRoom extends RoomLike = RoomLike> = {
  roomName: string;
  client: RoomClientLike<TRoom>;
};

export class RoomConnectionManager<TRoom extends RoomLike = RoomLike> {
  readonly #roomName: string;
  readonly #client: RoomClientLike<TRoom>;
  #activeRoom: TRoom | null = null;
  #activeOptionsKey: string | null = null;

  constructor(options: RoomConnectionManagerOptions<TRoom>) {
    this.#roomName = options.roomName;
    this.#client = options.client;
  }

  getActiveRoom() {
    return this.#activeRoom;
  }

  async connect(options: Record<string, unknown> = {}): Promise<TRoom> {
    const nextOptionsKey = JSON.stringify(options);

    if (this.#activeRoom && this.#activeOptionsKey === nextOptionsKey) {
      return this.#activeRoom;
    }

    if (this.#activeRoom) {
      await this.disconnect();
    }

    const room = await this.#client.joinOrCreate(this.#roomName, options);
    this.#activeRoom = room;
    this.#activeOptionsKey = nextOptionsKey;
    return room;
  }

  async disconnect() {
    if (!this.#activeRoom) {
      return;
    }

    const room = this.#activeRoom;
    this.#activeRoom = null;
    this.#activeOptionsKey = null;
    await room.leave(true);
  }
}
