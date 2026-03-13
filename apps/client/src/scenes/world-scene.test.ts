import assert from 'node:assert/strict';
import { describe, it, vi } from 'vitest';
import { createWorldScene } from './world-scene.ts';

type CallbackTarget = {
  __onAdd?: (value: unknown, key: string) => void;
  __onRemove?: (value: unknown, key: string) => void;
  __onChange?: () => void;
};

vi.mock('colyseus.js', () => ({
  getStateCallbacks: () => (target: CallbackTarget) => ({
    onAdd(handler: (value: unknown, key: string) => void) {
      target.__onAdd = handler;
    },
    onRemove(handler: (value: unknown, key: string) => void) {
      target.__onRemove = handler;
    },
    onChange(handler: () => void) {
      target.__onChange = handler;
    }
  })
}));

class FakeSprite {
  x: number;
  y: number;
  textureKey: string;
  frame: string;
  depth = 0;
  anims = {
    play: vi.fn(),
    stop: vi.fn()
  };

  constructor(x: number, y: number, textureKey: string, frame: string) {
    this.x = x;
    this.y = y;
    this.textureKey = textureKey;
    this.frame = frame;
  }

  setDepth(depth: number) {
    this.depth = depth;
    return this;
  }

  setTexture(textureKey: string, frame: string) {
    this.textureKey = textureKey;
    this.frame = frame;
    return this;
  }

  destroy() {}
}

class FakeText {
  x: number;
  y: number;
  depth = 0;
  originX = 0;
  originY = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  setDepth(depth: number) {
    this.depth = depth;
    return this;
  }

  setOrigin(originX: number, originY: number) {
    this.originX = originX;
    this.originY = originY;
    return this;
  }

  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  destroy() {}
}

class FakeLayer {
  depth = 0;

  setDepth(depth: number) {
    this.depth = depth;
    return this;
  }
}

class FakeRegistry {
  readonly store = new Map<string, unknown>();

  get(key: string) {
    return this.store.get(key);
  }
}

class FakeScene {
  readonly createdSprites: FakeSprite[] = [];
  readonly createdTexts: FakeText[] = [];
  readonly registry = new FakeRegistry();
  readonly make = {
    tilemap: () => ({
      widthInPixels: 1_280,
      heightInPixels: 1_280,
      addTilesetImage: () => ({}),
      createLayer: () => new FakeLayer()
    })
  };
  readonly add = {
    sprite: (x: number, y: number, textureKey: string, frame: string) => {
      const sprite = new FakeSprite(x, y, textureKey, frame);
      this.createdSprites.push(sprite);
      return sprite;
    },
    text: (x: number, y: number) => {
      const text = new FakeText(x, y);
      this.createdTexts.push(text);
      return text;
    }
  };
  readonly cameras = {
    main: {
      startFollow: () => this.cameras.main,
      setBounds: () => this.cameras.main
    }
  };
  readonly input = {
    keyboard: {
      on() {}
    }
  };
  readonly tweens = {
    add: ({ targets, x, y }: { targets: FakeSprite; x: number; y: number }) => {
      targets.x = x;
      targets.y = y;
      return {};
    }
  };

  constructor(_config?: unknown) {}
}

describe('world scene tile alignment', () => {
  it('spawns the local player at the authoritative tile origin from the session', () => {
    const WorldScene = createWorldScene(FakeScene as never);
    const scene = new WorldScene() as unknown as FakeScene & { create(): void };

    scene.registry.store.set('session', {
      guestId: 'guest-1',
      mapId: 'town',
      tileX: 11,
      tileY: 38,
      displayName: 'Trainer 1'
    });

    scene.create();

    const [localSprite, localLabel] = [scene.createdSprites[0], scene.createdTexts[0]];

    assert.deepEqual(
      { x: localSprite?.x, y: localSprite?.y },
      { x: 352, y: 1216 }
    );
    assert.deepEqual(
      { x: localLabel?.x, y: localLabel?.y },
      { x: 352, y: 1184 }
    );
  });

  it('uses exact tile-origin pixels when the authoritative room state updates players', () => {
    const WorldScene = createWorldScene(FakeScene as never);
    const scene = new WorldScene() as unknown as FakeScene & { create(): void };
    const players = {} as CallbackTarget;

    scene.registry.store.set('session', {
      guestId: 'guest-1',
      mapId: 'town',
      tileX: 11,
      tileY: 38,
      displayName: 'Trainer 1'
    });
    scene.registry.store.set('room', {
      sessionId: 'local-session',
      state: { players },
      onStateChange: { once() {} }
    });

    scene.create();

    const localPlayer = { tileX: 13, tileY: 7, direction: 'down' } as CallbackTarget & {
      tileX: number;
      tileY: number;
      direction: string;
    };
    const remotePlayer = {
      tileX: 9,
      tileY: 4,
      direction: 'right',
      displayName: 'Remote 1'
    } as CallbackTarget & {
      tileX: number;
      tileY: number;
      direction: string;
      displayName: string;
    };

    players.__onAdd?.(localPlayer, 'local-session');
    players.__onAdd?.(remotePlayer, 'remote-session');

    const [localSprite, remoteSprite] = scene.createdSprites;
    const [, remoteLabel] = scene.createdTexts;

    assert.deepEqual(
      { x: localSprite?.x, y: localSprite?.y },
      { x: 416, y: 224 }
    );
    assert.deepEqual(
      { x: remoteSprite?.x, y: remoteSprite?.y },
      { x: 288, y: 128 }
    );
    assert.deepEqual(
      { x: remoteLabel?.x, y: remoteLabel?.y },
      { x: 288, y: 96 }
    );
  });
});
