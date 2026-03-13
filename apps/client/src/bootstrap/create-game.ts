export type GameLike = {
  destroy(removeCanvas?: boolean): void;
};

export type GameConfig = {
  type: number;
  parent: string | HTMLElement;
  backgroundColor: string;
  render: {
    pixelArt: boolean;
  };
  scale: {
    width: number;
    height: number;
  };
  scene: unknown[];
};

export type PhaserModuleLike = {
  AUTO: number;
  Game: new (config?: unknown) => GameLike;
};

export type CreateGameOptions = {
  parent: string | HTMLElement;
  scenes?: readonly unknown[];
  rendererType?: number;
  gameFactory?: (config: GameConfig) => GameLike;
  phaserModule?: PhaserModuleLike;
};

const DEFAULT_SCENE_LIST: unknown[] = [];

function buildDefaultConfig(options: CreateGameOptions, phaserModule?: PhaserModuleLike): GameConfig {
  return {
    type: options.rendererType ?? phaserModule?.AUTO ?? 0,
    parent: options.parent,
    backgroundColor: '#78c070',
    render: {
      pixelArt: true
    },
    scale: {
      width: 960,
      height: 640
    },
    scene: options.scenes ? [...options.scenes] : [...DEFAULT_SCENE_LIST]
  };
}

export function createGame(options: CreateGameOptions): GameLike {
  const config = buildDefaultConfig(options, options.phaserModule);

  if (options.gameFactory) {
    return options.gameFactory(config);
  }

  if (!options.phaserModule) {
    throw new Error('createGame requires either a gameFactory or phaserModule');
  }

  return new options.phaserModule.Game(config);
}
