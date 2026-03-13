import http from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { defineMock, serverConstructorSpy, transportConstructorSpy } = vi.hoisted(() => ({
  defineMock: vi.fn((name: string, _roomClass: unknown, options: unknown) => ({ name, options })),
  serverConstructorSpy: vi.fn(),
  transportConstructorSpy: vi.fn()
}));

vi.mock('colyseus', async (importOriginal) => {
  const actual = await importOriginal<typeof import('colyseus')>();

  class Server {
    readonly transport: unknown;

    constructor(options: { greet: boolean; transport: unknown }) {
      serverConstructorSpy(options);
      this.transport = options.transport;
    }

    define = defineMock;
  }

  return {
    ...actual,
    Server
  };
});

vi.mock('@colyseus/ws-transport', () => {
  class WebSocketTransport {
    readonly server: unknown;

    constructor(options?: { server?: unknown }) {
      transportConstructorSpy(options);
      this.server = options?.server;
    }

    shutdown() {}
  }

  return { WebSocketTransport };
});

import {
  WORLD_ROOM_NAME,
  buildColyseusServer,
  defaultWorldRoomOptions,
  registerWorldRoom,
  resolveServerStartupConfig
} from './server';
import { WorldRoom } from './rooms/world-room';

describe('colyseus scaffolding smoke', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    defineMock.mockClear();
    serverConstructorSpy.mockClear();
    transportConstructorSpy.mockClear();
  });

  it('registers the world room with the default options', () => {
    const handler = { name: WORLD_ROOM_NAME, options: defaultWorldRoomOptions };
    const define = vi.fn(() => handler);

    const registered = registerWorldRoom({ define });

    expect(define).toHaveBeenCalledWith(WORLD_ROOM_NAME, WorldRoom, defaultWorldRoomOptions);
    expect(registered).toBe(handler);
  });

  it('uses the expected startup defaults when no env override is provided', () => {
    expect(resolveServerStartupConfig({})).toEqual({
      host: '0.0.0.0',
      port: 3001,
      worldRoom: defaultWorldRoomOptions
    });
  });

  it('builds the runtime with an explicit websocket transport and transport diagnostics', () => {
    const server = http.createServer();
    const runtime = buildColyseusServer(server, {
      HOST: '127.0.0.1',
      PORT: '4010'
    });

    try {
      expect(transportConstructorSpy).toHaveBeenCalledWith({ server });
      expect(serverConstructorSpy).toHaveBeenCalledWith({
        greet: false,
        transport: runtime.transport
      });
      expect(runtime.transport).toBe((runtime.gameServer as { transport: unknown }).transport);
      expect(runtime.transport.constructor.name).toBe('WebSocketTransport');
      expect(runtime.transport.server).toBe(server);
      expect(runtime.transportName).toBe('WebSocketTransport');
      expect(runtime.startupConfig).toEqual({
        host: '127.0.0.1',
        port: 4010,
        worldRoom: defaultWorldRoomOptions
      });
      expect(runtime.worldRoomHandler).toMatchObject({
        name: WORLD_ROOM_NAME,
        options: defaultWorldRoomOptions
      });
    } finally {
      runtime.transport.shutdown();
    }
  });
});
