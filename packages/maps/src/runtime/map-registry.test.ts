import { describe, expect, it } from 'vitest';
import { loadCompiledMap } from './map-registry';

describe('map registry', () => {
  it('loads maps from generated folder', () => {
    const map = loadCompiledMap('town');
    expect(map.mapId).toBe('town');
  });
});
