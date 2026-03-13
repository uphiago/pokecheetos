import type { WorldPlayerSnapshot } from '../world/world-store.ts';

export class RemotePlayerEntity {
  readonly id: string;
  #snapshot: WorldPlayerSnapshot;

  constructor(snapshot: WorldPlayerSnapshot) {
    this.id = snapshot.id;
    this.#snapshot = snapshot;
  }

  update(snapshot: WorldPlayerSnapshot): void {
    this.#snapshot = snapshot;
  }

  getSnapshot(): WorldPlayerSnapshot {
    return this.#snapshot;
  }
}
