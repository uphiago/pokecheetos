import type { GuestBootstrapResponse } from '@pokecheetos/shared';
import { RoomConnectionError, RoomConnectionManager } from '../network/room-connection-manager.ts';
import {
  RoomJoinError,
  createRoomClient,
  type RoomLike,
  type RoomClient as RoomClientInstance
} from '../network/room-client.ts';
import { SessionBootstrapError, SessionClient } from '../session/session-client.ts';
import { UiShellBridge } from '../ui/ui-shell-bridge.ts';
import {
  createClientDiagnostics,
  reportClientDiagnostics,
  type ClientDiagnostics
} from '../ui/client-diagnostics.ts';
import { createBootScene } from '../scenes/boot-scene.ts';
import { createWorldScene } from '../scenes/world-scene.ts';

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
    mode: number;
    autoCenter: number;
    width: number;
    height: number;
  };
  physics: {
    default: string;
    arcade: { gravity: { y: number }; debug: boolean };
  };
  scene: unknown[];
};

export type PhaserModuleLike = {
  AUTO: number;
  Game: new (config?: unknown) => GameLike;
  Scene?: unknown;
};

type SessionClientLike = {
  bootstrapStoredGuest(): Promise<GuestBootstrapResponse>;
};

type RoomConnectionManagerLike<TRoom extends RoomLike> = {
  connect(identity: GuestBootstrapResponse): Promise<TRoom>;
};

type UiShellBridgeLike<TRoom extends RoomLike> = {
  showBooting(): void;
  showConnected(input: { session: GuestBootstrapResponse; room: TRoom }): void;
  showError(input: {
    diagnostics: ClientDiagnostics;
    recovery?: {
      label: string;
      run(): void;
    };
  }): void;
};

export type CreateGameOptions<TRoom extends RoomLike = RoomLike> = {
  parent: string | HTMLElement;
  scenes?: readonly unknown[];
  rendererType?: number;
  gameFactory?: (config: GameConfig) => GameLike;
  phaserModule?: PhaserModuleLike;
  baseUrl?: string;
  roomEndpoint?: string;
  sessionClient?: SessionClientLike;
  roomClient?: RoomClientInstance<TRoom>;
  roomConnectionManager?: RoomConnectionManagerLike<TRoom>;
  uiShellBridge?: UiShellBridgeLike<TRoom>;
  createUiShellBridge?: (parent: string | HTMLElement) => UiShellBridgeLike<TRoom>;
  diagnosticsLogger?: Pick<Console, 'error'>;
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
      mode: 3,       // Phaser.Scale.FIT — redimensiona mantendo aspect ratio
      autoCenter: 1, // Phaser.Scale.CENTER_BOTH
      width: 960,
      height: 640
    },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: options.scenes ? [...options.scenes] : [...DEFAULT_SCENE_LIST]
  };
}

export async function createGame<TRoom extends RoomLike = RoomLike>(
  options: CreateGameOptions<TRoom>
): Promise<{
  game: GameLike;
  room: TRoom;
  session: GuestBootstrapResponse;
  uiShellBridge: UiShellBridgeLike<TRoom>;
}> {
  const uiShellBridge =
    options.uiShellBridge ??
    options.createUiShellBridge?.(options.parent) ??
    new UiShellBridge(isDatasetContainer(options.parent) ? options.parent : undefined);
  const sessionClient = options.sessionClient ?? new SessionClient({ baseUrl: options.baseUrl });
  const roomConnectionManager =
    options.roomConnectionManager ?? createDefaultRoomConnectionManager(options);
  let session: GuestBootstrapResponse | undefined;
  let room: TRoom;

  for (;;) {
    uiShellBridge.showBooting();

    try {
      session ??= await sessionClient.bootstrapStoredGuest();
      room = await roomConnectionManager.connect(session);
      break;
    } catch (error) {
      const diagnostics = createClientDiagnostics(error, {
        phase: isConnectPhaseCandidate(session) ? 'connect' : 'bootstrap',
        roomIdHint: session?.roomIdHint
      });
      reportClientDiagnostics({
        diagnostics,
        error,
        logger: options.diagnosticsLogger
      });

      await new Promise<void>((resolve) => {
        uiShellBridge.showError({
          diagnostics,
          recovery: diagnostics.retryable
            ? {
                label: diagnostics.phase === 'connect' ? 'Retry room join' : 'Retry connection',
                run() {
                  if (diagnostics.phase === 'bootstrap') {
                    session = undefined;
                  }

                  resolve();
                }
              }
            : undefined
        });
      });
    }
  }

  if (!session) {
    throw new Error('createGame resolved without a bootstrapped session');
  }

  uiShellBridge.showConnected({ session, room });

  const config = buildDefaultConfig(options, options.phaserModule);

  // Build default scene list when phaserModule provides Scene class and no scenes were specified
  if (
    options.phaserModule?.Scene &&
    (!options.scenes || options.scenes.length === 0) &&
    !options.gameFactory
  ) {
    const PhaserScene = options.phaserModule.Scene as typeof Phaser.Scene;
    config.scene = [createBootScene(PhaserScene), createWorldScene(PhaserScene)];
  }

  const game = options.gameFactory
    ? options.gameFactory(config)
    : createPhaserGame(config, options.phaserModule);

  // Store room and session in registry so scenes can access them
  if (!options.gameFactory) {
    (game as unknown as { registry: { set(k: string, v: unknown): void } }).registry.set('room', room);
    (game as unknown as { registry: { set(k: string, v: unknown): void } }).registry.set('session', session);
  }

  return {
    game,
    room,
    session,
    uiShellBridge
  };
}

function isConnectPhaseCandidate(session: GuestBootstrapResponse | undefined): session is GuestBootstrapResponse {
  return Boolean(session);
}

function createDefaultRoomConnectionManager<TRoom extends RoomLike>(
  options: CreateGameOptions<TRoom>
): RoomConnectionManagerLike<TRoom> {
  const roomClient =
    options.roomClient ??
    (createRoomClient(options.roomEndpoint ?? deriveRoomEndpoint(options.baseUrl)) as unknown as RoomClientInstance<TRoom>);

  return new RoomConnectionManager({
    roomClient
  }) as unknown as RoomConnectionManagerLike<TRoom>;
}

function createPhaserGame(config: GameConfig, phaserModule?: PhaserModuleLike): GameLike {
  if (!phaserModule) {
    throw new Error('createGame requires either a gameFactory or phaserModule');
  }

  return new phaserModule.Game(config);
}

function deriveRoomEndpoint(baseUrl?: string): string {
  const origin = baseUrl ?? resolveBrowserOrigin();
  if (!origin) {
    throw new Error('createGame requires roomEndpoint or baseUrl when no browser origin is available');
  }

  return origin;
}

function resolveBrowserOrigin(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.location.origin;
}

function isDatasetContainer(parent: string | HTMLElement): parent is HTMLElement {
  return typeof parent !== 'string' && 'dataset' in parent;
}

function resolveClientBootstrapErrorCode(error: unknown): string {
  if (
    error instanceof SessionBootstrapError ||
    error instanceof RoomConnectionError ||
    error instanceof RoomJoinError
  ) {
    return error.code;
  }

  return 'unknown';
}

function resolveClientBootstrapErrorMessage(error: unknown): string {
  if (error instanceof SessionBootstrapError) {
    if (error.code === 'network_fetch_failed') {
      return 'Could not reach the session service. Check the server and network.';
    }

    return 'Could not start a guest session.';
  }

  if (error instanceof RoomConnectionError || error instanceof RoomJoinError) {
    return 'Could not connect to the game room.';
  }

  return error instanceof Error ? error.message : 'Unknown bootstrap error';
}
