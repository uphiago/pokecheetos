import { buildHttpApp } from './http/app';
import { buildColyseusServer } from './colyseus/server';

async function main() {
  const app = await buildHttpApp();
  const runtime = buildColyseusServer(app.server);

  await app.listen({
    host: runtime.startupConfig.host,
    port: runtime.startupConfig.port
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
