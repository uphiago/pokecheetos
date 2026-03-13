export type NpcEntityState = {
  id: string;
  tileX: number;
  tileY: number;
  blocksMovement: boolean;
};

export class NpcEntity {
  #state: NpcEntityState;

  constructor(initialState: NpcEntityState) {
    this.#state = initialState;
  }

  get state(): NpcEntityState {
    return this.#state;
  }
}
