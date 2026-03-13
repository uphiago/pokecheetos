import { buildHttpApp } from './http/app';

async function main() {
  const app = await buildHttpApp();
  await app.listen({ host: '0.0.0.0', port: 3001 });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
