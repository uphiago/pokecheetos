import type { RoomLike } from '../network/room-connection-manager.ts';
import type { WorldSceneController } from './world-scene-controller.ts';

export const WORLD_SCENE_KEY = 'world-scene';

export class WorldScene<TRoom extends RoomLike> {
  readonly key = WORLD_SCENE_KEY;
  readonly #controller: WorldSceneController<TRoom>;

  constructor(controller: WorldSceneController<TRoom>) {
    this.#controller = controller;
  }

  update(): void {
    this.#controller.syncUiFromStore();
  }
}
