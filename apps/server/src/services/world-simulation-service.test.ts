import { describe, expect, it, vi } from 'vitest';

import type { CompiledMap } from '@pokecheetos/maps';

import { createWorldSimulationService } from './world-simulation-service';

function createRepositorySpy() {
  return {
    updateLastKnownState: vi.fn(),
    updateLastSeenAt: vi.fn()
  };
}

const baseMap: CompiledMap = {
  mapId: 'test-town',
  width: 12,
  height: 12,
  defaultSpawnId: 'spawn',
  blockedTiles: ['4:4'],
  spawns: {
    spawn: { tileX: 2, tileY: 2 },
    route_entry: { tileX: 1, tileY: 1 }
  },
  transitions: [{ tileKey: '10:0', toMapId: 'route-1', toSpawnId: 'route_entry' }],
  npcs: [
    {
      id: 'npc-blocker',
      tileX: 6,
      tileY: 5,
      facing: 'left',
      blocking: true,
      textId: 'npc.blocker'
    }
  ]
};

describe('world simulation service', () => {
  it('does not move into blocked tiles and still persists lastSeenAt', () => {
    const repository = createRepositorySpy();
    const service = createWorldSimulationService(repository);

    const result = service.simulateStep({
      guestId: 'guest-1',
      heldDirection: 'down',
      bufferedDirection: undefined,
      player: {
        mapId: 'test-town',
        tileX: 4,
        tileY: 3,
        direction: 'down'
      },
      compiledMap: baseMap,
      loadMapById: () => {
        throw new Error('no transition expected');
      }
    });

    expect(result).toEqual({
      moved: false,
      mapChanged: false,
      consumedBufferedDirection: false,
      player: {
        mapId: 'test-town',
        tileX: 4,
        tileY: 3,
        direction: 'down'
      }
    });
    expect(repository.updateLastKnownState).not.toHaveBeenCalled();
    expect(repository.updateLastSeenAt).toHaveBeenCalledWith('guest-1');
  });

  it('advances exactly one tile in open space and persists the authoritative state', () => {
    const repository = createRepositorySpy();
    const service = createWorldSimulationService(repository);

    const result = service.simulateStep({
      guestId: 'guest-2',
      heldDirection: 'right',
      bufferedDirection: undefined,
      player: {
        mapId: 'test-town',
        tileX: 2,
        tileY: 2,
        direction: 'up'
      },
      compiledMap: baseMap,
      loadMapById: () => {
        throw new Error('no transition expected');
      }
    });

    expect(result).toEqual({
      moved: true,
      mapChanged: false,
      consumedBufferedDirection: false,
      player: {
        mapId: 'test-town',
        tileX: 3,
        tileY: 2,
        direction: 'right'
      }
    });
    expect(repository.updateLastKnownState).toHaveBeenCalledWith('guest-2', {
      lastMapId: 'test-town',
      lastTileX: 3,
      lastTileY: 2,
      lastDirection: 'right'
    });
    expect(repository.updateLastSeenAt).toHaveBeenCalledWith('guest-2');
  });

  it('uses the buffered direction once and resolves transitions to destination spawn', () => {
    const repository = createRepositorySpy();
    const service = createWorldSimulationService(repository);
    const transitionMap: CompiledMap = {
      ...baseMap,
      blockedTiles: [...baseMap.blockedTiles, '10:2']
    };
    const destinationMap: CompiledMap = {
      mapId: 'route-1',
      width: 20,
      height: 20,
      defaultSpawnId: 'route_entry',
      blockedTiles: [],
      spawns: {
        route_entry: { tileX: 1, tileY: 1 }
      },
      transitions: [],
      npcs: []
    };

    const result = service.simulateStep({
      guestId: 'guest-3',
      heldDirection: 'down',
      bufferedDirection: 'up',
      player: {
        mapId: 'test-town',
        tileX: 10,
        tileY: 1,
        direction: 'left'
      },
      compiledMap: transitionMap,
      loadMapById: (mapId) => {
        expect(mapId).toBe('route-1');
        return destinationMap;
      }
    });

    expect(result).toEqual({
      moved: true,
      mapChanged: true,
      consumedBufferedDirection: true,
      transition: {
        mapId: 'route-1',
        spawnId: 'route_entry',
        roomIdHint: 'route-1:base:1'
      },
      player: {
        mapId: 'route-1',
        tileX: 1,
        tileY: 1,
        direction: 'up'
      }
    });
    expect(repository.updateLastKnownState).toHaveBeenCalledWith('guest-3', {
      lastMapId: 'route-1',
      lastTileX: 1,
      lastTileY: 1,
      lastDirection: 'up'
    });
    expect(repository.updateLastSeenAt).toHaveBeenCalledWith('guest-3');
  });

  it('prefers the held direction before considering a buffered fallback', () => {
    const repository = createRepositorySpy();
    const service = createWorldSimulationService(repository);

    const result = service.simulateStep({
      guestId: 'guest-5',
      heldDirection: 'right',
      bufferedDirection: 'up',
      player: {
        mapId: 'test-town',
        tileX: 2,
        tileY: 2,
        direction: 'left'
      },
      compiledMap: baseMap,
      loadMapById: () => {
        throw new Error('no transition expected');
      }
    });

    expect(result).toEqual({
      moved: true,
      mapChanged: false,
      consumedBufferedDirection: false,
      player: {
        mapId: 'test-town',
        tileX: 3,
        tileY: 2,
        direction: 'right'
      }
    });
    expect(repository.updateLastKnownState).toHaveBeenCalledWith('guest-5', {
      lastMapId: 'test-town',
      lastTileX: 3,
      lastTileY: 2,
      lastDirection: 'right'
    });
    expect(repository.updateLastSeenAt).toHaveBeenCalledWith('guest-5');
  });

  it('rejects movement into blocking npcs', () => {
    const repository = createRepositorySpy();
    const service = createWorldSimulationService(repository);

    const result = service.simulateStep({
      guestId: 'guest-4',
      heldDirection: undefined,
      bufferedDirection: 'right',
      player: {
        mapId: 'test-town',
        tileX: 5,
        tileY: 5,
        direction: 'up'
      },
      compiledMap: baseMap,
      loadMapById: () => {
        throw new Error('no transition expected');
      }
    });

    expect(result).toEqual({
      moved: false,
      mapChanged: false,
      consumedBufferedDirection: false,
      player: {
        mapId: 'test-town',
        tileX: 5,
        tileY: 5,
        direction: 'right'
      }
    });
    expect(repository.updateLastKnownState).not.toHaveBeenCalled();
    expect(repository.updateLastSeenAt).toHaveBeenCalledWith('guest-4');
  });
});
