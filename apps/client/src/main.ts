import { createGame } from './bootstrap/create-game.js';
import {
  hasClientBootstrapErrorReport,
  mapClientBootstrapError,
  markClientBootstrapErrorReported,
  reportClientBootstrapError
} from './bootstrap/client-error-mapper.js';

async function bootstrapClient() {
  const mountNode = document.querySelector<HTMLElement>('#app');

  try {
    if (!mountNode) {
      throw new Error('Expected #app mount node');
    }

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
        Game: phaserModule.Game as unknown as new (config?: unknown) => { destroy(removeCanvas?: boolean): void },
        Scene: phaserModule.Scene
      }
    });
  } catch (error) {
    const mappedError = mapClientBootstrapError(error);
    if (!hasClientBootstrapErrorReport(error)) {
      reportClientBootstrapError(mappedError);
      markClientBootstrapErrorReported(error);
    }
    if (mountNode) {
      mountNode.innerHTML = `<pre style="color:#fff;background:#330;padding:12px">${mappedError.code}: ${mappedError.userMessage}</pre>`;
    }
  }
}

void bootstrapClient();
