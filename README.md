# PokeCheetos

Monorepo foundation for an authoritative multiplayer top-down game inspired by Pokémon-style exploration.

This repository is rebuilding the legacy prototype into a clean workspace with strict package boundaries:

- **Authoritative server simulation** (Fastify + Colyseus)
- **Phaser client** rendering server-authoritative state
- **Tiled-backed maps** compiled into runtime-safe artifacts
- **Shared contracts/config** consumed across apps and packages

## Monorepo Structure

- `apps/client` — Phaser client, session bootstrap, room connection, rendering/UI
- `apps/server` — Fastify bootstrap API, Colyseus rooms, persistence, load test
- `packages/config` — runtime constants + shared TS/ESLint/Prettier presets
- `packages/shared` — protocol contracts, grid helpers, world/visibility types
- `packages/maps` — authored map validation + compile pipeline + runtime registry
- `packages/testing` — cross-workspace fixtures and smoke-test helpers
- `docs/` — plans, design notes, and implementation guidance

## Setup

```bash
pnpm install
```

## Run Apps

In separate terminals:

```bash
# server
pnpm --filter @pokecheetos/server dev

# client
pnpm --filter @pokecheetos/client dev
```

## Build

```bash
# full workspace build graph
pnpm build

# client-only production build
pnpm --filter @pokecheetos/client build
```

## Validation Commands

```bash
# lint workspace
pnpm lint

# typecheck workspace
pnpm typecheck

# run all tests
pnpm test

# smoke package integration
pnpm --filter @pokecheetos/testing test -- packages/testing/src/smoke/workspace-smoke.test.ts
```

## Load Test

```bash
pnpm --filter @pokecheetos/server exec tsx src/loadtest/world-room.loadtest.ts --clients 50 --duration-ms 120000 --map-id town
```

## Current v1 Scope

- Guest bootstrap and token-based restore flow
- Authoritative movement and room-state simulation
- Map transitions based on compiled map metadata
- NPC interaction with server-validated dialogue events
- Phaser world rendering with room connection/reconnection lifecycle
- Workspace-level package contracts and smoke coverage

## Explicitly Out of Scope (for this foundation phase)

- Chat systems
- Audio pipeline
- Mobile-specific UX
- Inventory/economy systems
- Combat/battles
- React UI shell migration

## Legacy Prototype

The old `client/` and `server/` prototype folders were removed after migrating to `apps/client` and `apps/server`.
