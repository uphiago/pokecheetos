import { findTransitionAtTile, isBlocked, type CompiledMap } from '@pokecheetos/maps';
import { applyDirection, type Direction } from '@pokecheetos/shared';

import type { ReturnTypeCreatePlayerRepository } from './types';

type WorldSimulationRepository = Pick<
  ReturnTypeCreatePlayerRepository,
  'updateLastKnownState' | 'updateLastSeenAt'
>;

type SimulatedPlayerState = Readonly<{
  mapId: string;
  tileX: number;
  tileY: number;
  direction: Direction;
}>;

type WorldSimulationRequest = Readonly<{
  guestId: string;
  heldDirection?: Direction;
  bufferedDirection?: Direction;
  player: SimulatedPlayerState;
  compiledMap: CompiledMap;
  loadMapById: (mapId: string) => CompiledMap;
}>;

type TransitionResult = Readonly<{
  mapId: string;
  spawnId: string;
  roomIdHint: string;
}>;

type WorldSimulationResult = Readonly<{
  moved: boolean;
  mapChanged: boolean;
  consumedBufferedDirection: boolean;
  player: SimulatedPlayerState;
  transition?: TransitionResult;
}>;

export type WorldSimulationService = Readonly<{
  simulateStep(request: WorldSimulationRequest): WorldSimulationResult;
}>;

export function createWorldSimulationService(
  repository: WorldSimulationRepository
): WorldSimulationService {
  return {
    simulateStep(request) {
      const attemptedDirections = getAttemptedDirections(request);

      if (attemptedDirections.length === 0) {
        repository.updateLastSeenAt(request.guestId);
        return {
          moved: false,
          mapChanged: false,
          consumedBufferedDirection: false,
          player: request.player
        };
      }

      for (const direction of attemptedDirections) {
        const facingPlayer = {
          ...request.player,
          direction
        };
        const nextTile = applyDirection(facingPlayer, direction);

        if (!isInsideBounds(request.compiledMap, nextTile.tileX, nextTile.tileY)) {
          continue;
        }

        if (
          isBlocked(request.compiledMap, nextTile.tileX, nextTile.tileY) ||
          hasBlockingNpc(request.compiledMap, nextTile.tileX, nextTile.tileY)
        ) {
          continue;
        }

        const transition = findTransitionAtTile(request.compiledMap, nextTile.tileX, nextTile.tileY);
        if (transition) {
          const destinationMap = request.loadMapById(transition.toMapId);
          const destinationSpawn = destinationMap.spawns[transition.toSpawnId];

          if (!destinationSpawn) {
            throw new Error(
              `Map ${transition.toMapId} missing spawn ${transition.toSpawnId} for transition`
            );
          }

          const transitionedPlayer = {
            mapId: transition.toMapId,
            tileX: destinationSpawn.tileX,
            tileY: destinationSpawn.tileY,
            direction
          };

          persistPlayerState(repository, request.guestId, transitionedPlayer);

          return {
            moved: true,
            mapChanged: true,
            consumedBufferedDirection: direction === request.bufferedDirection,
            transition: {
              mapId: transition.toMapId,
              spawnId: transition.toSpawnId,
              roomIdHint: `${transition.toMapId}:base:1`
            },
            player: transitionedPlayer
          };
        }

        const movedPlayer = {
          mapId: request.player.mapId,
          tileX: nextTile.tileX,
          tileY: nextTile.tileY,
          direction
        };

        persistPlayerState(repository, request.guestId, movedPlayer);

        return {
          moved: true,
          mapChanged: false,
          consumedBufferedDirection: direction === request.bufferedDirection,
          player: movedPlayer
        };
      }

      const blockedFacingDirection = request.heldDirection ?? request.bufferedDirection ?? request.player.direction;

      repository.updateLastSeenAt(request.guestId);
      return {
        moved: false,
        mapChanged: false,
        consumedBufferedDirection: false,
        player: {
          ...request.player,
          direction: blockedFacingDirection
        }
      };
    }
  };
}

function getAttemptedDirections(request: WorldSimulationRequest): Direction[] {
  const directions: Direction[] = [];

  if (request.heldDirection) {
    directions.push(request.heldDirection);
  }

  if (request.bufferedDirection && request.bufferedDirection !== request.heldDirection) {
    directions.push(request.bufferedDirection);
  }

  return directions;
}

function persistPlayerState(
  repository: WorldSimulationRepository,
  guestId: string,
  player: SimulatedPlayerState
) {
  repository.updateLastKnownState(guestId, {
    lastMapId: player.mapId,
    lastTileX: player.tileX,
    lastTileY: player.tileY,
    lastDirection: player.direction
  });
  repository.updateLastSeenAt(guestId);
}

function hasBlockingNpc(compiledMap: CompiledMap, tileX: number, tileY: number) {
  return compiledMap.npcs.some((npc) => npc.blocking && npc.tileX === tileX && npc.tileY === tileY);
}

function isInsideBounds(compiledMap: CompiledMap, tileX: number, tileY: number) {
  return tileX >= 0 && tileY >= 0 && tileX < compiledMap.width && tileY < compiledMap.height;
}
