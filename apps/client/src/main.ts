import { createGame } from './bootstrap/create-game.js';

async function bootstrapClient() {
  const mountNode = document.querySelector<HTMLElement>('#app');

  if (!mountNode) {
    throw new Error('Expected #app mount node');
  }

  mountNode.dataset.client = 'booting';

  const phaserModule = await import('phaser');

  createGame({
    parent: mountNode,
    phaserModule: {
      AUTO: phaserModule.AUTO,
      Game: phaserModule.Game
    },
    scenes: []
  });

  mountNode.dataset.client = 'ready';
}

void bootstrapClient();
