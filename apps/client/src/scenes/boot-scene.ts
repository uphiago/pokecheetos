export const BOOT_SCENE_KEY = 'boot-scene';
export const WORLD_SCENE_KEY = 'world-scene';

const TILE_SIZE = 32;

export function createBootScene(PhaserScene: typeof Phaser.Scene) {
  return class BootScene extends PhaserScene {
    constructor() {
      super({ key: BOOT_SCENE_KEY });
    }

    preload(): void {
      this.load.image('tuxmon-extruded', '/assets/tilesets/tuxmon-sample-32px-extruded.png');
      this.load.tilemapTiledJSON('town', '/assets/tilemaps/town.json');
      this.load.tilemapTiledJSON('route1', '/assets/tilemaps/route1.json');
      this.load.atlas('currentPlayer', '/assets/atlas/atlas.png', '/assets/atlas/atlas.json');
      this.load.multiatlas('players', '/assets/atlas/players.json', '/assets/atlas/');
    }

    create(): void {
      // Local player animations
      this.anims.create({
        key: 'misa-left-walk',
        frames: this.anims.generateFrameNames('currentPlayer', {
          prefix: 'misa-left-walk.',
          start: 0,
          end: 3,
          zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: 'misa-right-walk',
        frames: this.anims.generateFrameNames('currentPlayer', {
          prefix: 'misa-right-walk.',
          start: 0,
          end: 3,
          zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: 'misa-front-walk',
        frames: this.anims.generateFrameNames('currentPlayer', {
          prefix: 'misa-front-walk.',
          start: 0,
          end: 3,
          zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: 'misa-back-walk',
        frames: this.anims.generateFrameNames('currentPlayer', {
          prefix: 'misa-back-walk.',
          start: 0,
          end: 3,
          zeroPad: 3
        }),
        frameRate: 10,
        repeat: -1
      });

      // Online player animations
      this.anims.create({
        key: 'onlinePlayer-left-walk',
        frames: this.anims.generateFrameNames('players', {
          prefix: 'bob_left_walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
          suffix: '.png'
        }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: 'onlinePlayer-right-walk',
        frames: this.anims.generateFrameNames('players', {
          prefix: 'bob_right_walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
          suffix: '.png'
        }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: 'onlinePlayer-front-walk',
        frames: this.anims.generateFrameNames('players', {
          prefix: 'bob_front_walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
          suffix: '.png'
        }),
        frameRate: 10,
        repeat: -1
      });
      this.anims.create({
        key: 'onlinePlayer-back-walk',
        frames: this.anims.generateFrameNames('players', {
          prefix: 'bob_back_walk.',
          start: 0,
          end: 3,
          zeroPad: 3,
          suffix: '.png'
        }),
        frameRate: 10,
        repeat: -1
      });

      this.scene.start(WORLD_SCENE_KEY);
    }
  };
}

export { TILE_SIZE };
