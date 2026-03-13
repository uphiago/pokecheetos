import { toPixelPosition } from '@pokecheetos/shared';
import { getStateCallbacks } from 'colyseus.js';
import { WORLD_SCENE_KEY, TILE_SIZE } from './boot-scene.ts';

const MOVE_TWEEN_MS = 180; // slightly under server MOVE_DELAY_MS (200ms)

type PlayerEntry = {
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
};

function tileToPixel(tileX: number, tileY: number) {
  return toPixelPosition({ tileX, tileY }, TILE_SIZE);
}

function dirToWalkAnim(prefix: string, dir: string): string {
  const d: Record<string, string> = { left: 'left', right: 'right', up: 'back', down: 'front' };
  return `${prefix}-${d[dir] ?? 'front'}-walk`;
}

function dirToIdleFrame(isLocal: boolean, dir: string): string {
  const d: Record<string, string> = { left: 'left', right: 'right', up: 'back', down: 'front' };
  const face = d[dir] ?? 'front';
  return isLocal ? `misa-${face}` : `bob_${face}.png`;
}

export function createWorldScene(PhaserScene: typeof Phaser.Scene) {
  return class WorldScene extends PhaserScene {
    #localSprite: Phaser.GameObjects.Sprite | null = null;
    #localLabel: Phaser.GameObjects.Text | null = null;
    #remotes = new Map<string, PlayerEntry>();

    constructor() {
      super({ key: WORLD_SCENE_KEY });
    }

    create(): void {
      const room    = this.registry.get('room')    as any;
      const session = this.registry.get('session') as any;

      const mapKey = session?.mapId === 'route-1' ? 'route1' : 'town';

      // ── Tilemap ──────────────────────────────────────────────────────────
      const map     = this.make.tilemap({ key: mapKey });
      const tileset = map.addTilesetImage('tuxmon-sample-32px-extruded', 'tuxmon-extruded')!;

      map.createLayer('Below Player', tileset, 0, 0);
      map.createLayer('World',        tileset, 0, 0);
      const aboveLayer = map.createLayer('Above Player', tileset, 0, 0);
      aboveLayer?.setDepth(10);

      // ── Local player sprite (server-authoritative — sem physics) ─────────
      const { x: spawnX, y: spawnY } = tileToPixel(session?.tileX ?? 2, session?.tileY ?? 2);

      this.#localSprite = this.add
        .sprite(spawnX, spawnY, 'currentPlayer', 'misa-front')
        .setDepth(5);

      this.#localLabel = this.add
        .text(spawnX, spawnY - 32, session?.displayName ?? 'You', {
          fontSize: '12px', color: '#ffffff',
          stroke: '#000000', strokeThickness: 3
        })
        .setDepth(6).setOrigin(0.5, 1);

      // ── Camera ───────────────────────────────────────────────────────────
      this.cameras.main
        .startFollow(this.#localSprite)
        .setBounds(0, 0, map.widthInPixels, map.heightInPixels);

      // ── Keyboard → server ────────────────────────────────────────────────
      this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
        const dir = codeToDir(e.code);
        if (dir) room?.send('move_intent', { type: 'move_intent', direction: dir, pressed: true });
      });
      this.input.keyboard!.on('keyup', (e: KeyboardEvent) => {
        const dir = codeToDir(e.code);
        if (dir) room?.send('move_intent', { type: 'move_intent', direction: dir, pressed: false });
      });

      // ── Colyseus state callbacks ──────────────────────────────────────────
      if (!room) return;
      const $ = getStateCallbacks(room);
      const state = room.state as any;

      if (state?.players) {
        this.#bindPlayers($, state, room.sessionId);
      } else {
        room.onStateChange.once((s: any) => this.#bindPlayers($, s, room.sessionId));
      }
    }

    #bindPlayers(
      $: ReturnType<typeof getStateCallbacks>,
      state: any,
      localId: string
    ): void {
      $(state.players).onAdd((player: any, sessionId: string) => {
        if (sessionId === localId) {
          // Sync position immediately from authoritative state on join
          this.#syncLocal(player);
          $(player).onChange(() => this.#syncLocal(player));
          return;
        }

        const { x, y } = tileToPixel(player.tileX ?? 0, player.tileY ?? 0);

        const sprite = this.add
          .sprite(x, y, 'players', 'bob_front.png')
          .setDepth(5);

        const label = this.add
          .text(x, y - 32, player.displayName ?? sessionId.slice(0, 6), {
            fontSize: '11px', color: '#ffffff',
            stroke: '#000000', strokeThickness: 3
          })
          .setDepth(6).setOrigin(0.5, 1);

        this.#remotes.set(sessionId, { sprite, label });
        $(player).onChange(() => this.#syncRemote(sessionId, player));
      });

      $(state.players).onRemove((_: any, sessionId: string) => {
        const e = this.#remotes.get(sessionId);
        if (e) { e.sprite.destroy(); e.label.destroy(); this.#remotes.delete(sessionId); }
      });
    }

    #syncLocal(player: any): void {
      const { x, y } = tileToPixel(player.tileX, player.tileY);
      const sprite = this.#localSprite;
      if (!sprite) return;

      const moved = Math.abs(sprite.x - x) > 1 || Math.abs(sprite.y - y) > 1;

      if (moved) {
        this.tweens.add({ targets: sprite, x, y, duration: MOVE_TWEEN_MS, ease: 'Linear' });
        sprite.anims.play(dirToWalkAnim('misa', player.direction ?? 'down'), true);
      } else {
        sprite.anims.stop();
        sprite.setTexture('currentPlayer', dirToIdleFrame(true, player.direction ?? 'down'));
      }

      this.#localLabel?.setPosition(x, y - 32);
    }

    #syncRemote(sessionId: string, player: any): void {
      const e = this.#remotes.get(sessionId);
      if (!e) return;
      const { x, y } = tileToPixel(player.tileX, player.tileY);

      const moved = Math.abs(e.sprite.x - x) > 1 || Math.abs(e.sprite.y - y) > 1;

      if (moved) {
        this.tweens.add({ targets: e.sprite, x, y, duration: MOVE_TWEEN_MS, ease: 'Linear' });
        e.sprite.anims.play(dirToWalkAnim('onlinePlayer', player.direction ?? 'down'), true);
      } else {
        e.sprite.anims.stop();
        e.sprite.setTexture('players', dirToIdleFrame(false, player.direction ?? 'down'));
      }

      e.label.setPosition(x, y - 32);
    }
  };
}

function codeToDir(code: string): string | null {
  const m: Record<string, string> = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };
  return m[code] ?? null;
}
