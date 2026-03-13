import { describe, expect, it } from 'vitest';
import { runtimeConfig } from './runtime';

describe('runtimeConfig', () => {
  it('exposes the agreed multiplayer constants', () => {
    expect(runtimeConfig.serverTickRate).toBe(20);
    expect(runtimeConfig.roomCapacity).toBe(50);
    expect(runtimeConfig.reconnectWindowMs).toBe(10_000);
    expect(runtimeConfig.visibilityWindow).toEqual({ width: 32, height: 24 });
    expect(runtimeConfig.interactionDistance).toBe(1);
  });
});
