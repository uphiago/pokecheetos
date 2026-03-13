import type { GuestBootstrapResponse } from '@pokecheetos/shared';
import type { RoomLike } from '../network/room-client.ts';

type RootDatasetLike = {
  dataset: Record<string, string | undefined>;
};

export type UiShellBridgeState = {
  status: 'idle' | 'booting' | 'ready' | 'error';
  guestId?: string;
  roomId?: string;
  error?: string;
};

export class UiShellBridge {
  readonly #root?: RootDatasetLike;
  #state: UiShellBridgeState = { status: 'idle' };

  constructor(root?: RootDatasetLike) {
    this.#root = root;
  }

  showBooting(): void {
    this.#state = { status: 'booting' };
    this.#writeDataset();
  }

  showConnected<TRoom extends RoomLike>(input: { session: GuestBootstrapResponse; room: TRoom }): void {
    this.#state = {
      status: 'ready',
      guestId: input.session.guestId,
      roomId: input.room.roomId ?? input.session.roomIdHint
    };
    this.#writeDataset();
  }

  showError(message: string): void {
    this.#state = {
      status: 'error',
      error: message
    };
    this.#writeDataset();
  }

  getState(): UiShellBridgeState {
    return { ...this.#state };
  }

  #writeDataset(): void {
    if (!this.#root) {
      return;
    }

    this.#root.dataset.client = this.#state.status;
    this.#root.dataset.guestId = this.#state.guestId;
    this.#root.dataset.roomId = this.#state.roomId;
    this.#root.dataset.error = this.#state.error;
  }
}
