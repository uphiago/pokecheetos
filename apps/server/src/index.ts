import { buildHttpApp } from './http/app';
import { buildColyseusServer } from './colyseus/server';
import { logger } from './logging/logger';

async function main() {
  const app = await buildHttpApp();
  const runtime = buildColyseusServer(app.server);

  await app.listen({
    host: runtime.startupConfig.host,
    port: runtime.startupConfig.port
  });
}

main().catch((error) => {
  logger.error(
    {
      event: 'server_startup',
      errorCode: 'SERVER_STARTUP_FAILED',
      error
    },
    'server startup failed'
  );
  process.exit(1);
});
