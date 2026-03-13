import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGame } from './create-game.ts';

describe('createGame', () => {
  it('passes the configured parent and scenes into the game factory', () => {
    const scenes = [{ key: 'BootScene' }];
    const fakeGame = { destroy() {} };
    const gameFactoryCalls: Array<Record<string, unknown>> = [];

    const game = createGame({
      parent: 'app',
      rendererType: 777,
      scenes,
      gameFactory: (config) => {
        gameFactoryCalls.push(config as Record<string, unknown>);
        return fakeGame;
      }
    });

    assert.equal(game, fakeGame);
    assert.equal(gameFactoryCalls.length, 1);
    assert.equal(gameFactoryCalls[0]?.type, 777);
    assert.equal(gameFactoryCalls[0]?.parent, 'app');
    assert.equal(gameFactoryCalls[0]?.scene, scenes);
  });
});
