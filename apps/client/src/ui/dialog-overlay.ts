import type { DialogueState } from '../world/world-store.ts';

export class DialogOverlay {
  #dialogue: DialogueState | null = null;

  update(dialogue: DialogueState | null): void {
    this.#dialogue = dialogue;
  }

  getCurrentLines(): string[] {
    return this.#dialogue?.lines ?? [];
  }

  isVisible(): boolean {
    return this.getCurrentLines().length > 0;
  }
}
