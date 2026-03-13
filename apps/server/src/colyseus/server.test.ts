import { describe, expect, it, vi } from 'vitest';
import {
  WORLD_ROOM_NAME,
  defaultWorldRoomOptions,
  registerWorldRoom,
  resolveServerStartupConfig
} from './server';
import { WorldRoom } from './rooms/world-room';

describe('colyseus scaffolding smoke', () => {
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
});
