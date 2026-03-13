import type { FastifyInstance } from 'fastify';
import type { GuestBootstrapErrorResponse, GuestBootstrapRequest } from '@pokecheetos/shared';
import type { SessionService } from '../../services/session-service';
import { logger as defaultLogger, type Logger } from '../../logging/logger';

export async function registerGuestBootstrapRoute(
  app: FastifyInstance,
  sessionService: SessionService,
  logger: Logger = defaultLogger
) {
  app.post<{ Body: GuestBootstrapRequest }>('/api/session/guest', async (request, reply) => {
    try {
      const result = sessionService.bootstrapGuest(request.body ?? {});
      logger.info(
        {
          event: 'guest_bootstrap',
          phase: 'bootstrap',
          requestId: request.id,
          guestId: result.guestId,
          roomId: result.roomIdHint,
          mapId: result.mapId
        },
        'guest bootstrap success'
      );
      return result;
    } catch (error) {
      logger.error(
        {
          event: 'guest_bootstrap',
          phase: 'bootstrap',
          requestId: request.id,
          errorCode: 'BOOTSTRAP_FAILED',
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
