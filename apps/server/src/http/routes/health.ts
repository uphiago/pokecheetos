import type { FastifyInstance } from 'fastify';

export async function registerHealthRoute(app: FastifyInstance) {
  app.get('/', async () => ({ ok: true, service: 'pokecheetos-server' }));
  app.get('/health', async () => ({ ok: true }));
}
