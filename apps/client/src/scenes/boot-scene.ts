export const BOOT_SCENE_KEY = 'boot-scene';

export class BootScene {
  readonly key = BOOT_SCENE_KEY;

  preload(): void {
    // Asset preloading will be wired as spritesheets/audio are introduced.
  }

  create(): void {
    // Scene handoff is orchestrated by create-game wiring.
  }
}
