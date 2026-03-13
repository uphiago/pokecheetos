import Fastify from 'fastify';
import { createPlayerRepository } from '../persistence/repositories/player-repository';
import { createSessionService } from '../services/session-service';
import { registerGuestBootstrapRoute } from './routes/guest-bootstrap';
import { registerHealthRoute } from './routes/health';

export async function buildHttpApp() {
  const app = Fastify();

  const playerRepository = createPlayerRepository();
  const sessionService = createSessionService(playerRepository);

  await registerHealthRoute(app);
  await registerGuestBootstrapRoute(app, sessionService);

  return app;
}
