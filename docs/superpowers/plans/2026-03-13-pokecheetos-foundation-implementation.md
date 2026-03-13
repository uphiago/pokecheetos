# PokeCheetos Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current prototype into a clean `pokecheetos` monorepo with an authoritative multiplayer foundation, Tiled-backed maps, guest persistence, and a playable v1 slice.

**Architecture:** Replace the current `client/` and `server/` prototype with a `pnpm` monorepo composed of `apps/client`, `apps/server`, `packages/shared`, `packages/maps`, `packages/config`, and `packages/testing`. Fastify owns guest bootstrap, Colyseus owns room simulation and authoritative world state, `packages/maps` emits validated compiled runtime artifacts from authored Tiled JSON, and the Phaser client renders authoritative room state with no local prediction for the local player.

**Tech Stack:** TypeScript, pnpm workspaces, Turborepo, Vite, Phaser 3, Fastify, Colyseus, SQLite, Drizzle ORM, Vitest, ESLint, Prettier, tsx

---

## File Structure

### Root and Workspace

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Modify: `.gitignore`
- Modify: `README.md`

### Shared Config

- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.json`
- Create: `packages/config/tsconfig/node.json`
- Create: `packages/config/tsconfig/web.json`
- Create: `packages/config/eslint/base.cjs`
- Create: `packages/config/prettier/prettier.config.cjs`
- Create: `packages/config/src/runtime.ts`
- Create: `packages/config/src/index.ts`
- Test: `packages/config/src/runtime.test.ts`

### Shared Contracts and Helpers

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/grid/direction.ts`
- Create: `packages/shared/src/grid/tiles.ts`
- Create: `packages/shared/src/protocol/session.ts`
- Create: `packages/shared/src/protocol/client-to-server.ts`
- Create: `packages/shared/src/protocol/server-to-client.ts`
- Create: `packages/shared/src/world/player.ts`
- Create: `packages/shared/src/world/visibility.ts`
- Test: `packages/shared/src/grid/tiles.test.ts`
- Test: `packages/shared/src/protocol/session.test.ts`
- Test: `packages/shared/src/protocol/client-to-server.test.ts`
- Test: `packages/shared/src/protocol/server-to-client.test.ts`
- Test: `packages/shared/src/world/visibility.test.ts`

### Maps Package

- Create: `packages/maps/package.json`
- Create: `packages/maps/tsconfig.json`
- Create: `packages/maps/src/index.ts`
- Create: `packages/maps/src/schema/map-schema.ts`
- Create: `packages/maps/src/compiler/load-authored-map.ts`
- Create: `packages/maps/src/compiler/validate-authored-map.ts`
- Create: `packages/maps/src/compiler/compile-map.ts`
- Create: `packages/maps/src/compiler/write-compiled-maps.ts`
- Create: `packages/maps/src/runtime/map-registry.ts`
- Create: `packages/maps/src/runtime/collision.ts`
- Create: `packages/maps/src/runtime/transitions.ts`
- Create: `packages/maps/src/runtime/npcs.ts`
- Create: `packages/maps/authored/town.json`
- Create: `packages/maps/authored/route-1.json`
- Create: `packages/maps/generated/town.json`
- Create: `packages/maps/generated/route-1.json`
- Test: `packages/maps/src/compiler/compile-map.test.ts`
- Test: `packages/maps/src/runtime/map-registry.test.ts`
- Test: `packages/maps/src/runtime/collision.test.ts`
- Test: `packages/maps/src/runtime/transitions.test.ts`
- Test: `packages/maps/src/runtime/npcs.test.ts`

### Server App

- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/vitest.config.ts`
- Create: `apps/server/src/index.ts`
- Create: `apps/server/src/http/app.ts`
- Create: `apps/server/src/http/routes/guest-bootstrap.ts`
- Create: `apps/server/src/http/routes/health.ts`
- Create: `apps/server/src/logging/logger.ts`
- Create: `apps/server/src/services/session-service.ts`
- Create: `apps/server/src/services/presence-service.ts`
- Create: `apps/server/src/services/room-allocation-service.ts`
- Create: `apps/server/src/services/world-simulation-service.ts`
- Create: `apps/server/src/services/npc-interaction-service.ts`
- Create: `apps/server/src/colyseus/server.ts`
- Create: `apps/server/src/colyseus/schema/player-state.ts`
- Create: `apps/server/src/colyseus/schema/world-state.ts`
- Create: `apps/server/src/colyseus/rooms/world-room.ts`
- Create: `apps/server/src/persistence/db.ts`
- Create: `apps/server/src/persistence/schema.ts`
- Create: `apps/server/src/persistence/repositories/player-repository.ts`
- Create: `apps/server/src/persistence/migrations/0001_initial.sql`
- Create: `apps/server/src/loadtest/world-room.loadtest.ts`
- Test: `apps/server/src/http/routes/guest-bootstrap.test.ts`
- Test: `apps/server/src/persistence/repositories/player-repository.test.ts`
- Test: `apps/server/src/services/world-simulation-service.test.ts`
- Test: `apps/server/src/services/npc-interaction-service.test.ts`
- Test: `apps/server/src/colyseus/rooms/world-room.test.ts`

### Client App

- Create: `apps/client/package.json`
- Create: `apps/client/tsconfig.json`
- Create: `apps/client/vite.config.ts`
- Create: `apps/client/vitest.config.ts`
- Create: `apps/client/index.html`
- Create: `apps/client/src/main.ts`
- Create: `apps/client/src/bootstrap/create-game.ts`
- Create: `apps/client/src/bootstrap/create-game.test.ts`
- Create: `apps/client/src/session/session-client.ts`
- Create: `apps/client/src/network/room-client.ts`
- Create: `apps/client/src/network/room-connection-manager.ts`
- Create: `apps/client/src/world/world-store.ts`
- Create: `apps/client/src/world/entity-presenter.ts`
- Create: `apps/client/src/scenes/boot-scene.ts`
- Create: `apps/client/src/scenes/world-scene.ts`
- Create: `apps/client/src/scenes/world-scene-controller.ts`
- Create: `apps/client/src/entities/local-player.ts`
- Create: `apps/client/src/entities/remote-player.ts`
- Create: `apps/client/src/entities/npc.ts`
- Create: `apps/client/src/input/input-controller.ts`
- Create: `apps/client/src/ui/ui-shell-bridge.ts`
- Create: `apps/client/src/ui/dialog-overlay.ts`
- Create: `apps/client/src/assets/`
- Test: `apps/client/src/session/session-client.test.ts`
- Test: `apps/client/src/network/room-connection-manager.test.ts`
- Test: `apps/client/src/world/world-store.test.ts`
- Test: `apps/client/src/world/entity-presenter.test.ts`

### Testing Package

- Create: `packages/testing/package.json`
- Create: `packages/testing/tsconfig.json`
- Create: `packages/testing/src/index.ts`
- Create: `packages/testing/src/maps/fixtures.ts`
- Create: `packages/testing/src/server/create-test-room.ts`
- Create: `packages/testing/src/session/fixtures.ts`
- Create: `packages/testing/src/smoke/workspace-smoke.test.ts`

### Legacy Cleanup

- Delete later: `client/**`
- Delete later: `server/**`

## Chunk 1: Workspace, Config, and Shared Contracts

### Task 1: Create the root workspace and install the shared toolchain

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Modify: `.gitignore`

- [ ] **Step 1: Write the failing root workspace scaffold**

Create `package.json`:

```json
{
  "name": "pokecheetos",
  "private": true,
  "packageManager": "pnpm@10.6.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@typescript-eslint/eslint-plugin": "^8.18.1",
    "@typescript-eslint/parser": "^8.18.1",
    "eslint": "^9.17.0",
    "prettier": "^3.4.2",
    "turbo": "^2.3.3",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

Run: `pnpm exec turbo --version`
Expected: FAIL because dependencies are not installed yet

- [ ] **Step 2: Add workspace files and ignore rules**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
```

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^lint"] },
    "test": { "dependsOn": ["^test"], "outputs": ["coverage/**"] },
    "typecheck": { "dependsOn": ["^typecheck"] }
  }
}
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "baseUrl": "."
  }
}
```

Modify `.gitignore` to include:

```gitignore
node_modules
.turbo
dist
coverage
*.db
*.db-shm
*.db-wal
```

- [ ] **Step 3: Install the root toolchain**

Run: `pnpm install`
Expected: PASS, `pnpm-lock.yaml` created, root tools installed

- [ ] **Step 4: Verify workspace bootstrap**

Run: `pnpm exec turbo --version`
Expected: PASS

Run: `pnpm exec turbo run test --dry`
Expected: PASS and shows an empty or no-task dry run without package errors

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore pnpm-lock.yaml
git commit -m "chore: scaffold workspace and toolchain"
```

### Task 2: Build `packages/config` with runtime constants and shared tool configs

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.json`
- Create: `packages/config/tsconfig/node.json`
- Create: `packages/config/tsconfig/web.json`
- Create: `packages/config/eslint/base.cjs`
- Create: `packages/config/prettier/prettier.config.cjs`
- Create: `packages/config/src/runtime.ts`
- Create: `packages/config/src/index.ts`
- Test: `packages/config/src/runtime.test.ts`

- [ ] **Step 1: Write the failing runtime constants test**

Create `packages/config/src/runtime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { runtimeConfig } from './runtime';

describe('runtimeConfig', () => {
  it('exposes the agreed multiplayer constants', () => {
    expect(runtimeConfig.serverTickRate).toBe(20);
    expect(runtimeConfig.roomCapacity).toBe(50);
    expect(runtimeConfig.reconnectWindowMs).toBe(10_000);
    expect(runtimeConfig.visibilityWindow).toEqual({ width: 32, height: 24 });
    expect(runtimeConfig.interactionDistance).toBe(1);
  });
});
```

Run: `pnpm exec vitest run packages/config/src/runtime.test.ts`
Expected: FAIL because the config package does not exist yet

- [ ] **Step 2: Create package and config files**

Create `packages/config/package.json`:

```json
{
  "name": "@pokecheetos/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

Create `packages/config/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/config/tsconfig/node.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["node"]
  }
}
```

Create `packages/config/tsconfig/web.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  }
}
```

Create `packages/config/eslint/base.cjs`:

```js
module.exports = {
  root: false,
  env: { es2022: true, node: true, browser: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['dist', 'coverage']
};
```

Create `packages/config/prettier/prettier.config.cjs`:

```js
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'es5'
};
```

Create `packages/config/src/runtime.ts`:

```ts
export const runtimeConfig = {
  serverTickRate: 20,
  roomCapacity: 50,
  reconnectWindowMs: 10_000,
  visibilityWindow: { width: 32, height: 24 },
  interactionDistance: 1,
  baseRoomCountPerMap: 1,
  loadTestPlayers: 50,
  loadTestDurationMs: 120_000
} as const;
```

Create `packages/config/src/index.ts`:

```ts
export * from './runtime';
```

- [ ] **Step 3: Verify package-local loading**

Run: `pnpm exec vitest run packages/config/src/runtime.test.ts`
Expected: PASS

Run: `pnpm exec tsc -p packages/config/tsconfig.json --noEmit`
Expected: PASS

Run: `pnpm exec node -e "import('./packages/config/src/index.ts').then((m) => console.log(m.runtimeConfig.roomCapacity))"`
Expected: PASS and prints `50`

- [ ] **Step 4: Commit**

```bash
git add packages/config
git commit -m "feat: add shared config and runtime constants"
```

### Task 3: Build `packages/shared` with exact protocol and grid helpers

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/grid/direction.ts`
- Create: `packages/shared/src/grid/tiles.ts`
- Create: `packages/shared/src/protocol/session.ts`
- Create: `packages/shared/src/protocol/client-to-server.ts`
- Create: `packages/shared/src/protocol/server-to-client.ts`
- Create: `packages/shared/src/world/player.ts`
- Create: `packages/shared/src/world/visibility.ts`
- Test: `packages/shared/src/grid/tiles.test.ts`
- Test: `packages/shared/src/protocol/session.test.ts`
- Test: `packages/shared/src/protocol/client-to-server.test.ts`
- Test: `packages/shared/src/protocol/server-to-client.test.ts`
- Test: `packages/shared/src/world/visibility.test.ts`

- [ ] **Step 1: Write the failing helper and protocol tests**

Create `packages/shared/src/grid/tiles.test.ts` with tile movement and tile-to-pixel assertions.

Create `packages/shared/src/protocol/session.test.ts` with compile-time payload shape assertions for:

- `GuestBootstrapRequest` containing optional `guestToken`
- `GuestBootstrapResponse` containing `guestId`, `guestToken`, `displayName`, `mapId`, `tileX`, `tileY`, `roomIdHint`

Create `packages/shared/src/protocol/client-to-server.test.ts` with assertions for:

- `MoveIntentCommand` shape `{ type: 'move_intent', direction: 'up' | 'down' | 'left' | 'right', pressed: boolean }`
- `NpcInteractCommand` shape `{ type: 'npc_interact', npcId: string }`

Create `packages/shared/src/protocol/server-to-client.test.ts` with assertions for:

- `RoomErrorEvent` shape `{ type: 'room_error', code, message }`
- `NpcDialogueEvent` shape `{ type: 'npc_dialogue', npcId, lines }`
- `MapTransitionEvent` shape `{ type: 'map_transition', mapId, roomIdHint }`

Create `packages/shared/src/world/visibility.test.ts` with rectangle include/exclude assertions.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/shared/src/grid/tiles.test.ts packages/shared/src/protocol/session.test.ts packages/shared/src/protocol/client-to-server.test.ts packages/shared/src/protocol/server-to-client.test.ts packages/shared/src/world/visibility.test.ts`
Expected: FAIL because the shared package does not exist yet

- [ ] **Step 3: Create the package and exact source files**

Create `packages/shared/package.json`:

```json
{
  "name": "@pokecheetos/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

Create `packages/shared/src/grid/direction.ts`:

```ts
export const CARDINAL_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
export type Direction = (typeof CARDINAL_DIRECTIONS)[number];
```

Create `packages/shared/src/grid/tiles.ts`:

```ts
import type { Direction } from './direction';

export type TilePosition = { tileX: number; tileY: number };

export function applyDirection(position: TilePosition, direction: Direction): TilePosition {
  if (direction === 'up') return { tileX: position.tileX, tileY: position.tileY - 1 };
  if (direction === 'down') return { tileX: position.tileX, tileY: position.tileY + 1 };
  if (direction === 'left') return { tileX: position.tileX - 1, tileY: position.tileY };
  return { tileX: position.tileX + 1, tileY: position.tileY };
}

export function toPixelPosition(position: TilePosition, tileSize: number) {
  return { x: position.tileX * tileSize, y: position.tileY * tileSize };
}
```

Create `packages/shared/src/protocol/session.ts` with:

```ts
export type GuestBootstrapRequest = { guestToken?: string };
export type GuestBootstrapResponse = {
  guestId: string;
  guestToken: string;
  displayName: string;
  mapId: string;
  tileX: number;
  tileY: number;
  roomIdHint: string;
};
export type GuestBootstrapErrorResponse = {
  code: 'bootstrap_failed';
  message: string;
};
```

Create `packages/shared/src/protocol/client-to-server.ts` with:

```ts
import type { Direction } from '../grid/direction';

export type MoveIntentCommand = {
  type: 'move_intent';
  direction: Direction;
  pressed: boolean;
};

export type NpcInteractCommand = {
  type: 'npc_interact';
  npcId: string;
};
```

Create `packages/shared/src/protocol/server-to-client.ts` with:

```ts
export type RoomErrorEvent = {
  type: 'room_error';
  code: 'room_join_failed' | 'room_full' | 'invalid_interaction';
  message: string;
};

export type NpcDialogueEvent = {
  type: 'npc_dialogue';
  npcId: string;
  lines: string[];
};

export type MapTransitionEvent = {
  type: 'map_transition';
  mapId: string;
  roomIdHint: string;
};
```

Create `packages/shared/src/world/player.ts` with `PlayerSnapshot` and `LocalPlayerSnapshot` types.

Create `packages/shared/src/world/visibility.ts` with `VisibilityWindow` and `isTileVisible()`.

Create `packages/shared/src/index.ts` exporting all exact modules above.

- [ ] **Step 4: Verify the package**

Run: `pnpm --filter @pokecheetos/shared test`
Expected: PASS

Run: `pnpm --filter @pokecheetos/shared typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat: add shared grid and protocol contracts"
```

## Chunk 2: Maps, Server Scaffold, and Persistence

### Task 4: Create `packages/maps` and the compile-to-generated pipeline

**Files:**
- Create: `packages/maps/package.json`
- Create: `packages/maps/tsconfig.json`
- Create: `packages/maps/src/schema/map-schema.ts`
- Create: `packages/maps/src/compiler/load-authored-map.ts`
- Create: `packages/maps/src/compiler/validate-authored-map.ts`
- Create: `packages/maps/src/compiler/compile-map.ts`
- Create: `packages/maps/src/compiler/write-compiled-maps.ts`
- Create: `packages/maps/src/runtime/map-registry.ts`
- Create: `packages/maps/src/runtime/collision.ts`
- Create: `packages/maps/src/runtime/transitions.ts`
- Create: `packages/maps/src/runtime/npcs.ts`
- Create: `packages/maps/src/index.ts`
- Create: `packages/maps/authored/town.json`
- Create: `packages/maps/authored/route-1.json`
- Create: `packages/maps/generated/town.json`
- Create: `packages/maps/generated/route-1.json`
- Test: `packages/maps/src/compiler/compile-map.test.ts`
- Test: `packages/maps/src/runtime/map-registry.test.ts`
- Test: `packages/maps/src/runtime/collision.test.ts`
- Test: `packages/maps/src/runtime/transitions.test.ts`
- Test: `packages/maps/src/runtime/npcs.test.ts`

- [ ] **Step 1: Write the failing map compiler and runtime tests**

Create `packages/maps/src/compiler/compile-map.test.ts` with cases for:

- missing `defaultSpawnId` -> throws
- transition missing `toMapId` -> throws
- transition missing `toSpawnId` -> throws
- transition pointing to an unknown destination spawn in the destination map -> throws
- npc missing `textId` -> throws
- valid authored maps compile into output with `blockedTiles`, `spawns`, `transitions`, and `npcs`

Create `packages/maps/src/runtime/map-registry.test.ts` with assertions that runtime loading reads `packages/maps/generated/*.json` only.

Create `packages/maps/src/runtime/transitions.test.ts` with assertions that `findTransitionAtTile()` returns a destination map and spawn id.

Create `packages/maps/src/runtime/npcs.test.ts` with assertions that `getNpcById()` returns blocking NPC metadata and `textId`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/maps/src/compiler/compile-map.test.ts packages/maps/src/runtime/map-registry.test.ts packages/maps/src/runtime/collision.test.ts packages/maps/src/runtime/transitions.test.ts packages/maps/src/runtime/npcs.test.ts`
Expected: FAIL because the maps package does not exist yet

- [ ] **Step 3: Create the package, compiler, and runtime helpers**

Create `packages/maps/package.json` with scripts `test`, `typecheck`, and `build:maps`.

Implement:

- `load-authored-map.ts` to read authored Tiled JSON
- `validate-authored-map.ts` to enforce spawn, transition, and NPC metadata
- `compile-map.ts` to normalize authored data into compiled runtime shape
- `write-compiled-maps.ts` to emit `packages/maps/generated/*.json`
- `transitions.ts` to expose `findTransitionAtTile(compiledMap, tile)`
- `npcs.ts` to expose `getNpcById(compiledMap, npcId)`
- `map-registry.ts` to load compiled JSON only

Generated JSON is committed to the repo and also reproducible via `build:maps`.

- [ ] **Step 4: Emit and consume compiled artifacts**

Run: `pnpm --filter @pokecheetos/maps exec tsx src/compiler/write-compiled-maps.ts`
Expected: PASS, compiled JSON written to `packages/maps/generated/*.json`

Run: `pnpm --filter @pokecheetos/maps test`
Expected: PASS

- [ ] **Step 5: Verify package typecheck**

Run: `pnpm --filter @pokecheetos/maps typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/maps
git commit -m "feat: add compiled map pipeline and runtime registry"
```

### Task 5: Scaffold the server package and persistence layer together

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/vitest.config.ts`
- Create: `apps/server/src/persistence/db.ts`
- Create: `apps/server/src/persistence/schema.ts`
- Create: `apps/server/src/persistence/repositories/player-repository.ts`
- Create: `apps/server/src/persistence/migrations/0001_initial.sql`
- Test: `apps/server/src/persistence/repositories/player-repository.test.ts`

- [ ] **Step 1: Write the failing repository tests**

Create `apps/server/src/persistence/repositories/player-repository.test.ts` with cases for:

- `createGuest()` generates a persisted `guestId`, token hash, incremental `displayName`, and default spawn state
- `findByTokenHash()` restores the saved guest
- `updateLastKnownState()` persists `lastMapId`, `lastTileX`, `lastTileY`, and `lastDirection`
- `updateLastSeenAt()` updates `lastSeenAt`

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run apps/server/src/persistence/repositories/player-repository.test.ts`
Expected: FAIL because the server package does not exist yet

- [ ] **Step 3: Create the server package and persistence dependencies**

Create `apps/server/package.json` with exact dependencies for:

- `fastify`
- `colyseus`
- `drizzle-orm`
- `better-sqlite3`
- `tsx`
- `typescript`
- `vitest`

Create `apps/server/tsconfig.json` and `apps/server/vitest.config.ts`.

- [ ] **Step 4: Implement migrations, DB initialization, and repository**

Create `apps/server/src/persistence/migrations/0001_initial.sql` with the `players` table.

Create `apps/server/src/persistence/db.ts` so that:

- app startup opens SQLite
- migrations are applied before repository use
- tests calling `createPlayerRepository(':memory:')` also apply `0001_initial.sql` before assertions run

Create `player-repository.ts` methods:

- `createGuest()`
- `findByTokenHash()`
- `updateLastKnownState()`
- `updateLastSeenAt()`

- [ ] **Step 5: Verify persistence tests and typecheck**

Run: `pnpm --filter @pokecheetos/server test -- apps/server/src/persistence/repositories/player-repository.test.ts`
Expected: PASS

Run: `pnpm --filter @pokecheetos/server typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/server/package.json apps/server/tsconfig.json apps/server/vitest.config.ts apps/server/src/persistence
git commit -m "feat: add server scaffold and persistence"
```

## Chunk 3: Fastify, Colyseus, and Server Authority

### Task 6: Implement the Fastify bootstrap API with all required outcomes

**Files:**
- Create: `apps/server/src/index.ts`
- Create: `apps/server/src/http/app.ts`
- Create: `apps/server/src/http/routes/guest-bootstrap.ts`
- Create: `apps/server/src/http/routes/health.ts`
- Create: `apps/server/src/logging/logger.ts`
- Create: `apps/server/src/services/session-service.ts`
- Test: `apps/server/src/http/routes/guest-bootstrap.test.ts`

- [ ] **Step 1: Write the failing bootstrap route tests**

Create `apps/server/src/http/routes/guest-bootstrap.test.ts` with cases for:

- no token -> new guest created with `guestId`, `guestToken`, `displayName`, `mapId`, `tileX`, `tileY`, `roomIdHint`
- invalid token -> new guest created and replacement token returned
- valid token -> existing guest restored with persisted `mapId`, `tileX`, `tileY`, `roomIdHint`
- persistence failure -> typed 5xx payload `{ code: 'bootstrap_failed', message }`

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pokecheetos/server test -- apps/server/src/http/routes/guest-bootstrap.test.ts`
Expected: FAIL because the app and routes do not exist yet

- [ ] **Step 3: Implement Fastify app, route, logging, and session service**

Implement:

- `buildHttpApp()` in `src/http/app.ts`
- `/api/session/guest` in `src/http/routes/guest-bootstrap.ts`
- `/health` in `src/http/routes/health.ts`
- `session-service.ts` to create/recover/replace guest identities
- `logger.ts` with structured logs for bootstrap success/failure

Import runtime constants from `@pokecheetos/config`.

- [ ] **Step 4: Verify tests**

Run: `pnpm --filter @pokecheetos/server test -- apps/server/src/http/routes/guest-bootstrap.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/index.ts apps/server/src/http apps/server/src/logging/logger.ts apps/server/src/services/session-service.ts
git commit -m "feat: add fastify guest bootstrap api"
```

### Task 7: Implement room allocation, presence, simulation, and room message handlers

**Files:**
- Create: `apps/server/src/services/presence-service.ts`
- Create: `apps/server/src/services/room-allocation-service.ts`
- Create: `apps/server/src/services/world-simulation-service.ts`
- Create: `apps/server/src/colyseus/server.ts`
- Create: `apps/server/src/colyseus/schema/player-state.ts`
- Create: `apps/server/src/colyseus/schema/world-state.ts`
- Create: `apps/server/src/colyseus/rooms/world-room.ts`
- Test: `apps/server/src/services/world-simulation-service.test.ts`
- Test: `apps/server/src/colyseus/rooms/world-room.test.ts`

- [ ] **Step 1: Write the failing simulation and room tests**

Create `apps/server/src/services/world-simulation-service.test.ts` with cases for:

- blocked movement does not change authoritative tile
- open movement advances exactly one tile
- transition tile resolves destination map and spawn
- npc blocking prevents movement

Create `apps/server/src/colyseus/rooms/world-room.test.ts` with cases for:

- `move_intent` pressed and released commands update held direction state
- one-step input buffer is honored
- visibility enter/leave updates follow the configured rectangle
- reconnect within 10 seconds restores the same room reservation if possible
- room full during transition uses first available or newly created room
- duplicate guest connection ejects the older gameplay connection
- repository `updateLastKnownState()` and `updateLastSeenAt()` are called on authoritative movement

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pokecheetos/server test -- apps/server/src/services/world-simulation-service.test.ts apps/server/src/colyseus/rooms/world-room.test.ts`
Expected: FAIL because services and rooms do not exist yet

- [ ] **Step 3: Implement services**

Create `presence-service.ts` to track active guest gameplay connections and eject older duplicates.

Create `room-allocation-service.ts` to:

- keep one base room per map alive
- allocate first room with capacity
- create extra rooms when needed
- avoid destroying rooms with pending reconnect reservations

Create `world-simulation-service.ts` to:

- apply held direction and one-step buffered direction
- validate collision and transition via `@pokecheetos/maps`
- validate NPC blocking
- persist `lastMapId`, `lastTileX`, `lastTileY`, `lastDirection`, `lastSeenAt`

- [ ] **Step 4: Implement Colyseus state and room message handlers**

Create `player-state.ts`, `world-state.ts`, and `world-room.ts` so that:

- room join requires bootstrap identity data
- room runs simulation at `runtimeConfig.serverTickRate`
- room handles `move_intent` commands with `pressed` / `released`
- room handles `npc_interact` commands by delegating to `npc-interaction-service`
- room emits typed `npc_dialogue`, `map_transition`, and `room_error` payloads
- room logs join/leave/allocation/reconnect/transition events

- [ ] **Step 5: Verify tests**

Run: `pnpm --filter @pokecheetos/server test -- apps/server/src/services/world-simulation-service.test.ts apps/server/src/colyseus/rooms/world-room.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/services apps/server/src/colyseus
git commit -m "feat: add authoritative rooms and world simulation"
```

### Task 8: Implement NPC interaction wiring, metrics logs, and the baseline load test

**Files:**
- Create: `apps/server/src/services/npc-interaction-service.ts`
- Create: `apps/server/src/loadtest/world-room.loadtest.ts`
- Test: `apps/server/src/services/npc-interaction-service.test.ts`

- [x] **Step 1: Write the failing NPC interaction tests**

Create `apps/server/src/services/npc-interaction-service.test.ts` with cases for:

- valid adjacent and facing interaction succeeds
- invalid NPC id is rejected
- non-adjacent interaction is rejected
- wrong-facing interaction is rejected

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pokecheetos/server test -- apps/server/src/services/npc-interaction-service.test.ts`
Expected: FAIL because the service does not exist yet

- [x] **Step 3: Implement NPC interaction service and room wiring**

Create `npc-interaction-service.ts` to:

- resolve NPC metadata from compiled map data
- validate adjacency and facing
- return dialogue line arrays
- reject invalid ids and invalid positions

Update `world-room.ts` to send `npc_dialogue` events back to the requesting client.

- [x] **Step 4: Add the parameterized load test script**

Create `apps/server/src/loadtest/world-room.loadtest.ts` with CLI flags:

- `--clients`
- `--duration-ms`
- `--map-id`

The script must fail on:

- room crash
- duplicate identity detection
- corrupted authoritative tile state
- out-of-window players appearing in visible state

- [x] **Step 5: Verify tests and smoke-load mode**

Run: `pnpm --filter @pokecheetos/server test -- apps/server/src/services/npc-interaction-service.test.ts`
Expected: PASS

Run: `pnpm --filter @pokecheetos/server exec tsx src/loadtest/world-room.loadtest.ts --clients 5 --duration-ms 5000 --map-id town`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add apps/server/src/services/npc-interaction-service.ts apps/server/src/loadtest apps/server/src/services/npc-interaction-service.test.ts apps/server/src/colyseus/rooms/world-room.ts
git commit -m "feat: add npc interaction and load test baseline"
```

## Chunk 4: Phaser Client, UI Boundary, and Legacy Replacement

### Task 9: Implement session bootstrap, retry/reconnect policy, and client boot wiring

**Files:**
- Create: `apps/client/package.json`
- Create: `apps/client/tsconfig.json`
- Create: `apps/client/vite.config.ts`
- Create: `apps/client/vitest.config.ts`
- Create: `apps/client/index.html`
- Create: `apps/client/src/main.ts`
- Create: `apps/client/src/bootstrap/create-game.ts`
- Create: `apps/client/src/bootstrap/create-game.test.ts`
- Create: `apps/client/src/session/session-client.ts`
- Create: `apps/client/src/network/room-client.ts`
- Create: `apps/client/src/network/room-connection-manager.ts`
- Create: `apps/client/src/ui/ui-shell-bridge.ts`
- Test: `apps/client/src/session/session-client.test.ts`
- Test: `apps/client/src/network/room-connection-manager.test.ts`

- [ ] **Step 1: Write the failing client bootstrap tests**

Create `apps/client/src/session/session-client.test.ts` with cases for:

- missing token -> stores returned guest token
- invalid/unknown token -> replaces stored token
- corrupted localStorage token -> falls back to bootstrap response and stores replacement token
- retryable bootstrap failure -> surfaces an error without inventing a local guest

Create `apps/client/src/network/room-connection-manager.test.ts` with cases for:

- room join retries with the already-issued bootstrap identity after join failure
- same-room-first reconnect hint is preferred when reconnecting after a drop
- room join retry does not call guest bootstrap again

Create `apps/client/src/bootstrap/create-game.test.ts` with a smoke test that verifies `createGame()` wires session bootstrap, room connection, and UI shell creation without browser E2E.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run apps/client/src/session/session-client.test.ts apps/client/src/network/room-connection-manager.test.ts apps/client/src/bootstrap/create-game.test.ts`
Expected: FAIL because the client package does not exist yet

- [ ] **Step 3: Create the client package and boot files**

Create `apps/client/package.json` with dependencies for `phaser`, `colyseus.js`, `vite`, `vitest`, `typescript`, and `jsdom`.

Create `apps/client/tsconfig.json`, `apps/client/vite.config.ts`, `apps/client/vitest.config.ts`, and `apps/client/index.html`.

Create `apps/client/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom'
  }
});
```

Create `apps/client/src/main.ts` and `apps/client/src/bootstrap/create-game.ts` to:

- bootstrap the guest session
- create `room-client`
- create `room-connection-manager`
- create `ui-shell-bridge`
- start the Phaser game

- [ ] **Step 4: Implement session and connection layers**

Create `session-client.ts` to:

- read and write `pokecheetos.guestToken`
- call the Fastify bootstrap API
- return the typed bootstrap payload

Create `room-client.ts` to own Colyseus transport only.

Create `room-connection-manager.ts` to own:

- join lifecycle
- join retry using the already-issued identity
- same-room-first reconnect policy
- transition-time room switching

- [ ] **Step 5: Verify tests and typecheck**

Run: `pnpm --filter @pokecheetos/client test -- apps/client/src/session/session-client.test.ts apps/client/src/network/room-connection-manager.test.ts apps/client/src/bootstrap/create-game.test.ts`
Expected: PASS

Run: `pnpm --filter @pokecheetos/client typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/client
git commit -m "feat: add client bootstrap and room connection management"
```

### Task 10: Implement the world store, Phaser scenes, input, and dialogue rendering

**Files:**
- Create: `apps/client/src/world/world-store.ts`
- Create: `apps/client/src/world/entity-presenter.ts`
- Create: `apps/client/src/scenes/boot-scene.ts`
- Create: `apps/client/src/scenes/world-scene.ts`
- Create: `apps/client/src/scenes/world-scene-controller.ts`
- Create: `apps/client/src/entities/local-player.ts`
- Create: `apps/client/src/entities/remote-player.ts`
- Create: `apps/client/src/entities/npc.ts`
- Create: `apps/client/src/input/input-controller.ts`
- Create: `apps/client/src/ui/dialog-overlay.ts`
- Test: `apps/client/src/world/world-store.test.ts`
- Test: `apps/client/src/world/entity-presenter.test.ts`

- [x] **Step 1: Write the failing world state tests**

Create `apps/client/src/world/world-store.test.ts` with cases for:

- local player authoritative state stored separately from visible remote players
- visibility enter/leave updates add and remove remote players correctly
- incoming `npc_dialogue` payload updates dialogue state

Create `apps/client/src/world/entity-presenter.test.ts` with cases for:

- local authoritative tile maps to exact pixels
- remote players receive interpolation targets between authoritative tiles

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @pokecheetos/client test -- apps/client/src/world/world-store.test.ts apps/client/src/world/entity-presenter.test.ts`
Expected: FAIL because the store and presenter do not exist yet

- [x] **Step 3: Implement store and presenter**

Create `world-store.ts` to consume room state and room point events.

Create `entity-presenter.ts` to convert authoritative tile positions into render coordinates and remote tween targets.

- [x] **Step 4: Implement Phaser scenes, input, and dialogue flow**

Create:

- `boot-scene.ts`
- `world-scene.ts`
- `world-scene-controller.ts`
- `local-player.ts`
- `remote-player.ts`
- `npc.ts`
- `input-controller.ts`
- `dialog-overlay.ts`

Rules to enforce:

- `world-scene-controller.ts` may ask `room-connection-manager.ts` to change maps or send commands
- `world-scene.ts` must not own room retry or transport lifecycle
- `input-controller.ts` binds arrows + WASD to `move_intent` pressed/released commands
- `Space` sends `npc_interact` for the facing NPC
- `dialog-overlay.ts` renders returned dialogue lines from `npc_dialogue`

- [x] **Step 5: Verify client behavior**

Run: `pnpm --filter @pokecheetos/client test -- apps/client/src/world/world-store.test.ts apps/client/src/world/entity-presenter.test.ts`
Expected: PASS

Run: `pnpm --filter @pokecheetos/client build`
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add apps/client/src
git commit -m "feat: render authoritative world and npc dialogue in phaser"
```

### Task 11: Add the testing package, update docs, replace legacy prototype, and run the full baseline

**Files:**
- Create: `packages/testing/package.json`
- Create: `packages/testing/tsconfig.json`
- Create: `packages/testing/src/index.ts`
- Create: `packages/testing/src/maps/fixtures.ts`
- Create: `packages/testing/src/server/create-test-room.ts`
- Create: `packages/testing/src/session/fixtures.ts`
- Create: `packages/testing/src/smoke/workspace-smoke.test.ts`
- Modify: `README.md`
- Delete: `client/**`
- Delete: `server/**`

- [ ] **Step 1: Write the failing testing-package smoke test**

Create `packages/testing/src/smoke/workspace-smoke.test.ts` that imports and exercises:

- `@pokecheetos/shared`
- `@pokecheetos/maps`
- `@pokecheetos/config`
- `packages/testing/src/server/create-test-room.ts`
- `packages/testing/src/session/fixtures.ts`

Run: `pnpm exec vitest run packages/testing/src/smoke/workspace-smoke.test.ts`
Expected: FAIL because the package does not exist yet

- [ ] **Step 2: Implement the testing package**

Create `packages/testing/package.json`, `tsconfig.json`, `src/index.ts`, `src/maps/fixtures.ts`, `src/server/create-test-room.ts`, and `src/session/fixtures.ts`.

- [ ] **Step 3: Update the root README**

Rewrite `README.md` to cover:

- project purpose
- monorepo structure
- setup with `pnpm install`
- client and server run commands
- tests and load test commands
- current v1 scope and out-of-scope items

- [x] **Step 4: Remove the legacy prototype directories**

Delete `client/` and `server/` only after the replacement apps and docs are green.

- [x] **Step 5: Run final verification**

Run: `pnpm lint`
Expected: PASS

Run: `pnpm typecheck`
Expected: PASS

Run: `pnpm test`
Expected: PASS

Run: `pnpm --filter @pokecheetos/client build`
Expected: PASS

Run: `pnpm --filter @pokecheetos/server exec tsx src/loadtest/world-room.loadtest.ts --clients 50 --duration-ms 120000 --map-id town`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add README.md packages/testing apps packages client server
git commit -m "refactor: replace legacy prototype with pokecheetos foundation"
```

## Plan Review Checklist

Before execution, verify:

- every task has exact file paths
- every task has a failing test or failing verification first
- every task has explicit commands and expected outcomes
- every task ends with a commit
- runtime constants stay in `@pokecheetos/config`
- room lifecycle stays outside Phaser scenes
- load-test assertions cover crash, duplicate identity, state integrity, and visibility filtering

## Execution Notes

- Use a dedicated git worktree before implementation.
- Do not implement chat, audio, mobile support, inventory, combat, or React UI in this plan.
- Reuse legacy assets only if they fit the new boundaries cleanly.
- If implementation pressure pushes runtime constants, room lifecycle, or guest bootstrap logic into the wrong package, stop and correct the boundary before proceeding.

Plan complete and saved to `docs/superpowers/plans/2026-03-13-pokecheetos-foundation-implementation.md`. Ready to execute?

## Autopilot Run Log

- [x] 2026-03-13 05:27 BRT — baseline verification block
  - `pnpm typecheck` ✅
  - `pnpm test` ✅
  - `pnpm --filter @pokecheetos/client build` ✅
  - Notes: no blocking issue found in this verification pass.
- [x] 2026-03-13 05:27 BRT — task 8 closure verification block
  - `pnpm --filter @pokecheetos/server test -- apps/server/src/services/npc-interaction-service.test.ts` ✅
  - `pnpm --filter @pokecheetos/server exec tsx src/loadtest/world-room.loadtest.ts --clients 5 --duration-ms 5000 --map-id town` ✅
  - Notes: task 8 checklist reconciled with implemented commits; no blocking issue found.
- [x] 2026-03-13 06:08 BRT — task 7 movement input groundwork block
  - Implemented `move_intent` handling in `WorldRoom` with held direction + one-step buffered direction state.
  - Added focused tests in `apps/server/src/colyseus/rooms/world-room.test.ts` for pressed/released input and buffered-direction consume flow.
  - `pnpm --filter @pokecheetos/server test -- apps/server/src/colyseus/rooms/world-room.test.ts` ✅
  - `pnpm --filter @pokecheetos/server typecheck` ✅
  - Notes: groundwork complete; full room simulation tick/reconnect/visibility assertions still pending for full Task 7 closure.
- [x] 2026-03-13 06:29 BRT — task 7 simulation application block
  - Added `WorldRoom.simulateStepForClient()` to apply authoritative simulation output into room state, consume one-step buffered input, and emit typed `map_transition` events.
  - Wired room simulation interval to execute per connected client at room patch rate.
  - Added focused test covering simulation call payload, buffered-direction consumption, state mutation, and transition event emission.
  - `pnpm --filter @pokecheetos/server test -- apps/server/src/colyseus/rooms/world-room.test.ts` ✅
  - `pnpm --filter @pokecheetos/server typecheck` ✅
  - Notes: reconnect reservation and visibility enter/leave coverage still pending for complete Task 7 closure.
- [x] 2026-03-13 06:50 BRT — task 7 visibility diff coverage block
  - Added `WorldRoom.computeVisibilityDiff()` backed by `runtimeConfig.visibilityWindow` + `isTileVisible` to track enter/leave deltas for same-map players.
  - Wired simulation loop to refresh per-client visibility snapshots and added room leave cleanup for movement/visibility state.
  - Added focused `world-room.test.ts` coverage for visibility enter/leave behavior (same-map only, configured rectangle bounds).
  - `pnpm --filter @pokecheetos/server test -- apps/server/src/colyseus/rooms/world-room.test.ts` ✅
  - `pnpm --filter @pokecheetos/server typecheck` ✅
  - Notes: reconnect reservation/duplicate-guest room-level wiring remains pending for full Task 7 parity with the original checklist.
- [x] 2026-03-13 07:10 BRT — task 7 duplicate guest ejection block
  - Added `WorldRoom.onJoin()` bootstrap-state wiring so room joins hydrate authoritative `PlayerState` from guest bootstrap identity.
  - Wired `presence-service` registration plus per-connection cleanup to eject the older gameplay session when the same `guestId` joins again.
  - Added focused `world-room.test.ts` coverage proving the displaced session is removed from room state and asked to leave.
  - `pnpm --filter @pokecheetos/server test -- apps/server/src/colyseus/rooms/world-room.test.ts` ✅
  - `pnpm --filter @pokecheetos/server typecheck` ✅
  - Notes: reconnect reservation reuse is still pending before full Task 7 closure.
- [x] 2026-03-13 07:29 BRT — task 7 reconnect reservation block
  - Added room-level reconnect reservations in `WorldRoom` with `runtimeConfig.reconnectWindowMs` TTL and automatic expiry cleanup.
  - Updated leave/join lifecycle to reserve authoritative player snapshot on disconnect and restore snapshot when the same guest reconnects within window.
  - Added focused `world-room.test.ts` coverage for reconnect-state restore behavior.
  - `pnpm --filter @pokecheetos/server test -- apps/server/src/colyseus/rooms/world-room.test.ts` ✅
  - `pnpm --filter @pokecheetos/server typecheck` ✅
  - Notes: no blocking issue found in this block.
- [x] 2026-03-13 07:48 BRT — task 7 persistence wiring verification block
  - Added `WorldRoom` dependency injection for `playerRepository` so default room simulation can persist `updateLastKnownState()` and `updateLastSeenAt()` without custom simulation stubs.
  - Added focused `world-room.test.ts` coverage proving authoritative movement triggers repository persistence updates.
  - `pnpm --filter @pokecheetos/server test -- apps/server/src/colyseus/rooms/world-room.test.ts` ✅
  - `pnpm --filter @pokecheetos/server typecheck` ✅
  - Notes: no blocking issue found in this block.
- [x] 2026-03-13 08:08 BRT — task 7 room-allocation transition fallback coverage block
  - Added focused `room-allocation-service.test.ts` coverage for transition-time allocation behavior:
    - prefers the first room with capacity when allocating room hints;
    - creates a new overflow room hint when every existing room is at capacity.
  - `pnpm --filter @pokecheetos/server test -- apps/server/src/services/room-allocation-service.test.ts` ✅
  - `pnpm --filter @pokecheetos/server typecheck` ✅
  - Notes: no blocking issue found in this block.
- [x] 2026-03-13 08:29 BRT — task 9 client test-runner alignment block
  - Migrated Task 9 bootstrap/connection/create-game tests from `node:test` imports to `vitest` imports so they are discovered by the configured client test runner.
  - `pnpm exec vitest run apps/client/src/session/session-client.test.ts apps/client/src/network/room-connection-manager.test.ts apps/client/src/bootstrap/create-game.test.ts` ✅
  - `pnpm --filter @pokecheetos/client typecheck` ✅
  - Notes: no blocking issue found in this block.
- [x] 2026-03-13 08:48 BRT — client vitest script + world suite normalization block
  - Switched `apps/client/package.json` test script from Node's native runner to `vitest run` and added explicit client devDependencies (`vitest`, `jsdom`, `typescript`).
  - Migrated world suite files (`world-store.test.ts`, `entity-presenter.test.ts`) from `node:test` + `assert` to `vitest` + `expect` for a single consistent runner.
  - `pnpm --filter @pokecheetos/client test` ✅
  - `pnpm --filter @pokecheetos/client typecheck` ✅
  - Notes: no blocking issue found in this block.
- [x] 2026-03-13 09:08 BRT — task 10 checklist reconciliation + verification block
  - Reconciled Task 10 checklist items in the implementation plan with already-landed client world/scenes/input/dialogue commits.
  - `pnpm --filter @pokecheetos/client test -- apps/client/src/world/world-store.test.ts apps/client/src/world/entity-presenter.test.ts` ✅
  - `pnpm --filter @pokecheetos/client typecheck` ✅
  - `pnpm --filter @pokecheetos/client build` ✅ (non-blocking Vite chunk-size warning only)
  - Notes: no blocking issue found in this block.
- [x] 2026-03-13 09:29 BRT — task 11 final verification + legacy-readme alignment block
  - Reconciled Task 11 Step 4/5 checklist state after confirming legacy `client/` and `server/` folders are absent.
  - Updated `README.md` Legacy Prototype section to reflect completed migration.
  - `pnpm lint` ✅
  - `pnpm typecheck` ✅
  - `pnpm test` ✅
  - `pnpm --filter @pokecheetos/client build` ✅ (non-blocking Vite chunk-size warning only)
  - `pnpm --filter @pokecheetos/server exec tsx src/loadtest/world-room.loadtest.ts --clients 50 --duration-ms 120000 --map-id town` ✅
  - Notes: no blocking issue found in this block.
