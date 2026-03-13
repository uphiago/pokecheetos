import { createGame } from './bootstrap/create-game.js';

async function bootstrapClient() {
  const mountNode = document.querySelector<HTMLElement>('#app');

  if (!mountNode) {
    throw new Error('Expected #app mount node');
  }

  try {
    const phaserModule = await import('phaser');
    const apiBaseUrl = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001';
    const roomEndpoint =
      (import.meta.env?.VITE_ROOM_ENDPOINT as string | undefined) ?? 'http://localhost:3001';

    await createGame({
      parent: mountNode,
      baseUrl: apiBaseUrl,
      roomEndpoint,
      phaserModule: {
        AUTO: phaserModule.AUTO,
        Game: phaserModule.Game as unknown as new (config?: unknown) => { destroy(removeCanvas?: boolean): void }
      },
      scenes: []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado no bootstrap';
    mountNode.innerHTML = `<pre style="color:#fff;background:#330;padding:12px">${message}</pre>`;
    console.error(error);
  }
}

void bootstrapClient();
