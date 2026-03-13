import process from 'node:process';
import { runtimeConfig } from '@pokecheetos/config';
import { loadCompiledMap, isBlocked } from '@pokecheetos/maps';
import { isTileVisible, type Direction } from '@pokecheetos/shared';

type CliArgs = Readonly<{
  clients: number;
  durationMs: number;
  mapId: string;
}>;

type SimulatedPlayer = {
  id: string;
  tileX: number;
  tileY: number;
  direction: Direction;
};

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const compiledMap = loadCompiledMap(args.mapId);
  const spawn = compiledMap.spawns[compiledMap.defaultSpawnId];

  if (!spawn) {
    throw new Error(`Map ${args.mapId} has no default spawn ${compiledMap.defaultSpawnId}`);
  }

  const players = new Map<string, SimulatedPlayer>();
  const rng = createRng(42);
  const stopAt = Date.now() + args.durationMs;

  for (let index = 0; index < args.clients; index += 1) {
    const id = `client-${index + 1}`;

    if (players.has(id)) {
      throw new Error(`Duplicate identity detected: ${id}`);
    }

    players.set(id, {
      id,
      tileX: spawn.tileX,
      tileY: spawn.tileY,
      direction: 'down'
    });
  }

  while (Date.now() < stopAt) {
    for (const player of players.values()) {
      stepPlayer(player, compiledMap, rng);
      assertAuthoritativeTile(player, compiledMap);

      const visiblePlayers = [...players.values()].filter((candidate) =>
        isTileVisible(player, candidate, runtimeConfig.visibilityWindow)
      );

      for (const visiblePlayer of visiblePlayers) {
        const insideWindow = isTileVisible(player, visiblePlayer, runtimeConfig.visibilityWindow);
        if (!insideWindow) {
          throw new Error(
            `Out-of-window player ${visiblePlayer.id} appeared for ${player.id} visible state`
          );
        }
      }
    }

    await sleep(50);
  }

  console.log(
    `[loadtest] PASS map=${args.mapId} clients=${args.clients} durationMs=${args.durationMs}`
  );
}

function parseArgs(argv: string[]): CliArgs {
  const args = new Map<string, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    args.set(key, value);
    index += 1;
  }

  const clients = Number.parseInt(args.get('clients') ?? `${runtimeConfig.loadTestPlayers}`, 10);
  const durationMs = Number.parseInt(
    args.get('duration-ms') ?? `${runtimeConfig.loadTestDurationMs}`,
    10
  );
  const mapId = args.get('map-id') ?? 'town';

  if (!Number.isFinite(clients) || clients <= 0) {
    throw new Error(`Invalid --clients value: ${clients}`);
  }

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error(`Invalid --duration-ms value: ${durationMs}`);
  }

  return { clients, durationMs, mapId };
}

function stepPlayer(
  player: SimulatedPlayer,
  compiledMap: ReturnType<typeof loadCompiledMap>,
  rng: () => number
) {
  const direction = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)] ?? 'down';
  player.direction = direction;

  const next = nextTile(player, direction);

  const insideBounds =
    next.tileX >= 0 &&
    next.tileY >= 0 &&
    next.tileX < compiledMap.width &&
    next.tileY < compiledMap.height;

  if (!insideBounds || isBlocked(compiledMap, next.tileX, next.tileY)) {
    return;
  }

  player.tileX = next.tileX;
  player.tileY = next.tileY;
}

function assertAuthoritativeTile(
  player: SimulatedPlayer,
  compiledMap: ReturnType<typeof loadCompiledMap>
) {
  const insideBounds =
    player.tileX >= 0 &&
    player.tileY >= 0 &&
    player.tileX < compiledMap.width &&
    player.tileY < compiledMap.height;

  if (!insideBounds) {
    throw new Error(`Corrupted authoritative tile state for ${player.id}: out-of-bounds`);
  }

  if (isBlocked(compiledMap, player.tileX, player.tileY)) {
    throw new Error(`Corrupted authoritative tile state for ${player.id}: blocked tile`);
  }
}

function nextTile(player: SimulatedPlayer, direction: Direction) {
  if (direction === 'up') {
    return { tileX: player.tileX, tileY: player.tileY - 1 };
  }
  if (direction === 'down') {
    return { tileX: player.tileX, tileY: player.tileY + 1 };
  }
  if (direction === 'left') {
    return { tileX: player.tileX - 1, tileY: player.tileY };
  }
  return { tileX: player.tileX + 1, tileY: player.tileY };
}

function createRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void main().catch((error) => {
  console.error('[loadtest] FAIL', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
