import type { Direction, MoveIntentCommand, NpcInteractCommand } from '@pokecheetos/shared';

export type InputBindings = {
  onMoveIntent: (command: MoveIntentCommand) => void;
  onNpcInteract: (command: NpcInteractCommand) => void;
};

const KEY_DIRECTION_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right'
};

export class InputController {
  readonly #bindings: InputBindings;

  constructor(bindings: InputBindings) {
    this.#bindings = bindings;
  }

  handleKeyDown(code: string): void {
    if (code === 'Space') {
      this.#bindings.onNpcInteract({ type: 'npc_interact', npcId: '__facing__' });
      return;
    }

    const direction = KEY_DIRECTION_MAP[code];
    if (!direction) {
      return;
    }

    this.#bindings.onMoveIntent({ type: 'move_intent', direction, pressed: true });
  }

  handleKeyUp(code: string): void {
    const direction = KEY_DIRECTION_MAP[code];
    if (!direction) {
      return;
    }

    this.#bindings.onMoveIntent({ type: 'move_intent', direction, pressed: false });
  }
}
