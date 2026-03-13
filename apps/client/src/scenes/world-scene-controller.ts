import type { NpcInteractCommand } from '@pokecheetos/shared';
import type { RoomConnectionManager, RoomLike } from '../network/room-connection-manager.ts';
import { InputController } from '../input/input-controller.ts';
import { DialogOverlay } from '../ui/dialog-overlay.ts';
import { WorldStore } from '../world/world-store.ts';

export type WorldSceneControllerOptions<TRoom extends RoomLike> = {
  store: WorldStore;
  roomConnectionManager: RoomConnectionManager<TRoom>;
  sendMoveIntent: (room: TRoom, command: { type: 'move_intent'; direction: 'up' | 'down' | 'left' | 'right'; pressed: boolean }) => void;
  sendNpcInteract: (room: TRoom, command: NpcInteractCommand) => void;
};

export class WorldSceneController<TRoom extends RoomLike> {
  readonly #store: WorldStore;
  readonly #roomConnectionManager: RoomConnectionManager<TRoom>;
  readonly #dialogOverlay = new DialogOverlay();
  readonly #input: InputController;

  constructor(options: WorldSceneControllerOptions<TRoom>) {
    this.#store = options.store;
    this.#roomConnectionManager = options.roomConnectionManager;

    this.#input = new InputController({
      onMoveIntent: (command) => {
        const room = this.#roomConnectionManager.getActiveRoom();
        if (!room) return;
        options.sendMoveIntent(room, command);
      },
      onNpcInteract: (command) => {
        const room = this.#roomConnectionManager.getActiveRoom();
        if (!room) return;
        options.sendNpcInteract(room, command);
      }
    });
  }

  syncUiFromStore(): void {
    this.#dialogOverlay.update(this.#store.getDialogue());
  }

  getInputController(): InputController {
    return this.#input;
  }

  getDialogOverlay(): DialogOverlay {
    return this.#dialogOverlay;
  }
}
