import type { WorldPlayerSnapshot } from '../world/world-store.ts';

export class LocalPlayerEntity {
  #snapshot: WorldPlayerSnapshot | null = null;

  setSnapshot(snapshot: WorldPlayerSnapshot): void {
    this.#snapshot = snapshot;
  }

  getSnapshot(): WorldPlayerSnapshot | null {
    return this.#snapshot;
  }
}
