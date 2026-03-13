import type { GuestBootstrapRequest, GuestBootstrapResponse } from '@pokecheetos/shared';
import type { ReturnTypeCreatePlayerRepository } from './types';
import { hashGuestToken } from '../persistence/repositories/player-repository';

export type SessionService = ReturnType<typeof createSessionService>;

export function createSessionService(playerRepository: ReturnTypeCreatePlayerRepository) {
  return {
    bootstrapGuest(payload: GuestBootstrapRequest): GuestBootstrapResponse {
      if (!payload.guestToken) {
        const created = playerRepository.createGuest();
        return {
          guestId: created.guestId,
          guestToken: created.guestToken,
          displayName: created.displayName,
          mapId: created.mapId,
          tileX: created.tileX,
          tileY: created.tileY,
          roomIdHint: `${created.mapId}:base:1`
        };
      }

      const restored = playerRepository.findByTokenHash(hashGuestToken(payload.guestToken));
      if (!restored) {
        const created = playerRepository.createGuest();
        return {
          guestId: created.guestId,
          guestToken: created.guestToken,
          displayName: created.displayName,
          mapId: created.mapId,
          tileX: created.tileX,
          tileY: created.tileY,
          roomIdHint: `${created.mapId}:base:1`
        };
      }

      return {
        guestId: restored.guestId,
        guestToken: payload.guestToken,
        displayName: restored.displayName,
        mapId: restored.lastMapId,
        tileX: restored.lastTileX,
        tileY: restored.lastTileY,
        roomIdHint: `${restored.lastMapId}:base:1`
      };
    }
  };
}
