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

  logger.info(
    {
      event: 'server_boot_ready',
      phase: 'startup',
      host: runtime.startupConfig.host,
      port: runtime.startupConfig.port,
      transport: runtime.transportName,
      roomName: runtime.worldRoomHandler.name,
      roomId: runtime.startupConfig.worldRoom.roomId,
      mapId: runtime.startupConfig.worldRoom.mapId
    },
    'server listening'
  );
}

main().catch((error) => {
  logger.error(
    {
      event: 'server_boot_failed',
      phase: 'startup',
      error
    },
    'server startup failed'
  );
  process.exit(1);
});
