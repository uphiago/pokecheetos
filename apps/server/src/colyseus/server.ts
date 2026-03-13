import type { Server as HttpServer } from 'node:http';
import { Server, type RegisteredHandler } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { runtimeConfig } from '@pokecheetos/config';
import { WorldRoom, type WorldRoomOptions } from './rooms/world-room';

export const WORLD_ROOM_NAME = 'world';

export const defaultWorldRoomOptions = {
  mapId: 'town',
  roomId: 'town:base:1',
  maxClients: runtimeConfig.roomCapacity
} as const satisfies WorldRoomOptions;

export type ServerStartupConfig = Readonly<{
  host: string;
  port: number;
  worldRoom: WorldRoomOptions;
}>;

export type ColyseusRuntime = Readonly<{
  gameServer: Server;
  transport: WebSocketTransport;
  transportName: string;
  startupConfig: ServerStartupConfig;
  worldRoomHandler: RegisteredHandler;
}>;

type WorldRoomRegistrar<TResult> = {
  define: (name: typeof WORLD_ROOM_NAME, roomClass: typeof WorldRoom, defaultOptions: WorldRoomOptions) => TResult;
};

export function resolveServerStartupConfig(env: NodeJS.ProcessEnv = process.env): ServerStartupConfig {
  const port = parsePort(env.PORT);

  return {
    host: env.HOST ?? '0.0.0.0',
    port,
    worldRoom: defaultWorldRoomOptions
  };
}

export function registerWorldRoom<TResult extends { name: string; options: WorldRoomOptions }>(
  gameServer: WorldRoomRegistrar<TResult>,
  roomOptions: WorldRoomOptions = defaultWorldRoomOptions
): TResult {
  return gameServer.define(WORLD_ROOM_NAME, WorldRoom, roomOptions);
}

export function buildColyseusServer(
  server: HttpServer,
  env: NodeJS.ProcessEnv = process.env
): ColyseusRuntime {
  const startupConfig = resolveServerStartupConfig(env);
  const transport = new WebSocketTransport({ server });
  const gameServer = new Server({
    greet: false,
    transport
  });
  const worldRoomHandler = registerWorldRoom(gameServer, startupConfig.worldRoom);

  return {
    gameServer,
    transport,
    transportName: transport.constructor.name,
    startupConfig,
    worldRoomHandler
  };
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 3001;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 3001;
}
