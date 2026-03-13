import { createGame } from './bootstrap/create-game.js';

async function bootstrapClient() {
  const mountNode = document.querySelector<HTMLElement>('#app');

  if (!mountNode) {
    throw new Error('Expected #app mount node');
  }

  const phaserModule = await import('phaser');

  await createGame({
    parent: mountNode,
    phaserModule: {
      AUTO: phaserModule.AUTO,
      Game: phaserModule.Game as unknown as new (config?: unknown) => { destroy(removeCanvas?: boolean): void }
    },
    scenes: []
  });
}

void bootstrapClient();
