import type { FastifyInstance } from 'fastify';
import type { GuestBootstrapErrorResponse, GuestBootstrapRequest } from '@pokecheetos/shared';
import type { SessionService } from '../../services/session-service';
import { logger } from '../../logging/logger';

export async function registerGuestBootstrapRoute(app: FastifyInstance, sessionService: SessionService) {
  app.post<{ Body: GuestBootstrapRequest }>('/api/session/guest', async (request, reply) => {
    const hasGuestToken = typeof request.body?.guestToken === 'string' && request.body.guestToken.trim().length > 0;

    try {
      const result = sessionService.bootstrapGuest(request.body ?? {});
      const response = {
        ...result,
        requestId: request.id
      };
      logger.info(
        {
          event: 'guest_bootstrap_succeeded',
          phase: 'bootstrap',
          requestId: request.id,
          hasGuestToken,
          guestId: result.guestId,
          mapId: result.mapId,
          roomId: result.roomIdHint
        },
        'guest bootstrap success'
      );
      return response;
    } catch (error) {
      logger.error(
        {
          event: 'guest_bootstrap_failed',
          phase: 'bootstrap',
          requestId: request.id,
          hasGuestToken,
          error
        },
        'guest bootstrap failed'
      );
      const payload: GuestBootstrapErrorResponse = {
        code: 'bootstrap_failed',
        message: 'Failed to bootstrap guest session'
      };
      return reply.status(500).send(payload);
    }
  });
}
