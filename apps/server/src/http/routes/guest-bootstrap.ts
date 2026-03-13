import type { FastifyInstance } from 'fastify';
import type { GuestBootstrapErrorResponse, GuestBootstrapRequest } from '@pokecheetos/shared';
import type { SessionService } from '../../services/session-service';
import { logger } from '../../logging/logger';

export async function registerGuestBootstrapRoute(app: FastifyInstance, sessionService: SessionService) {
  app.post<{ Body: GuestBootstrapRequest }>('/api/session/guest', async (request, reply) => {
    try {
      const result = sessionService.bootstrapGuest(request.body ?? {});
      logger.info({ guestId: result.guestId, mapId: result.mapId }, 'guest bootstrap success');
      return result;
    } catch (error) {
      logger.error({ error }, 'guest bootstrap failed');
      const payload: GuestBootstrapErrorResponse = {
        code: 'bootstrap_failed',
        message: 'Failed to bootstrap guest session'
      };
      return reply.status(500).send(payload);
    }
  });
}
