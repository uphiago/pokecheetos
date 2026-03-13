# PokeCheetos Foundation Design

Date: 2026-03-13
Status: Draft for review

## 1. Context

This project will not preserve the current repository as a long-term foundation. The existing `PokeMMO-Online-Realtime-Multiplayer-Game` codebase is useful as a domain reference for:

- top-down map rendering
- multiplayer presence
- basic player movement
- Tiled-based world structure

The new foundation should be a guided rebuild with better architecture, stronger multiplayer guarantees, cleaner project boundaries, and clear room to evolve the game beyond the current prototype.

## 2. Product Goal

Build a lightweight browser-based multiplayer top-down world inspired by classic Pokemon traversal, where:

- a user opens the site
- receives or restores a guest session
- enters a shared map
- moves with keyboard input
- sees nearby players moving in real time

This foundation is intended to support future iteration, large refactors, and feature growth without being constrained by the current prototype.

## 3. Design Principles

- Server-authoritative from day one
- Browser-first and lightweight
- Grid-based world logic with smooth visual motion
- Shared source of truth for maps, collisions, and transitions
- Strong boundaries between rendering, networking, state, and persistence
- Monorepo with shared contracts and reusable pure logic
- Minimal v1 scope, but architecture ready for future upgrades

## 4. Explicit Non-Goals for v1

- no real account system
- no audio
- no mobile/touch controls
- no combat system
- no inventory
- no quest system
- no social systems
- no production CI implementation yet
- no React UI yet
- no chat in v1

The architecture must leave space for these later.

## 5. Core Decisions

### 5.1 Rebuild Strategy

Use a guided rebuild, not a preservation refactor.

- The current repo is reference material only.
- Core systems may be replaced completely when a stronger design exists.

### 5.2 Core Stack

- Client: Phaser 3 + Vite + TypeScript
- Server: Fastify + Colyseus + TypeScript
- Database: SQLite + Drizzle ORM
- Monorepo tooling: pnpm + Turborepo
- Tests: Vitest for the initial automated suite

### 5.3 Repo Direction

- New project/repo name: `pokecheetos`
- Target remote: `git@github.com:uphiago/pokecheetos.git`
- Current repository is the design/reference workspace for the transition

## 6. Monorepo Layout

```text
apps/
  client/
  server/
packages/
  shared/
  maps/
  config/
  testing/
```

Package naming convention:

- `@pokecheetos/shared`
- `@pokecheetos/maps`
- `@pokecheetos/config`
- `@pokecheetos/testing`

### Responsibilities

#### `apps/client`

- Phaser bootstrap
- scene lifecycle
- local input handling
- rendering
- local interpolation/tweening
- UI shell integration points

#### `apps/server`

- Fastify HTTP server
- guest session bootstrap
- Colyseus room lifecycle
- authoritative simulation
- persistence integration
- metrics/logging

#### `packages/shared`

- network contracts
- shared enums
- tile/grid helpers
- direction helpers
- pure validation helpers
- protocol constants

This package must not depend on Phaser, Fastify, or Colyseus runtime APIs.

#### `packages/maps`

- Tiled JSON sources
- map compilation/validation pipeline
- collision metadata
- spawn metadata
- transition metadata
- map-loading helpers for runtime consumption

#### `packages/config`

- shared TypeScript config
- shared ESLint config
- shared Prettier config
- runtime constants and tunables

#### `packages/testing`

- testing fixtures
- room test helpers
- map fixtures
- persistence test helpers

## 7. World Model

### 7.1 Map Source of Truth

Tiled JSON is the map authoring format and the single source of truth for:

- tile layout
- collision
- spawn points
- transitions
- interactable trigger metadata

The runtime should not consume raw authored maps directly without validation.

### 7.2 Map Pipeline

Map pipeline will be:

1. author in Tiled
2. export as JSON
3. run compile/validation step
4. produce normalized map data for runtime

The compile step should validate:

- required spawn points
- valid collision metadata
- valid transition targets
- trigger schema correctness
- consistent map identifiers

### 7.3 Map Transitions

Map transitions are driven by Tiled-defined triggers.

- no hardcoded transitions in gameplay logic
- server validates transition entry
- server moves player to the correct target map/room
- spawn target inside destination map is defined by map metadata

## 8. Multiplayer Architecture

### 8.1 Room Strategy

- one base room per map stays alive
- extra rooms are created per map when capacity is reached
- extra rooms can be destroyed when empty
- base rooms do not shut down under normal operation

### 8.2 Capacity

- initial limit: 50 players per instance
- capacity is a measured value, not a permanent promise
- future scaling decisions must come from load test evidence

### 8.3 Placement Strategy

Players join the first instance with available capacity in v1.

No friend/group-aware instance selection in v1.

### 8.4 Visibility Strategy

Visibility is proximity-based from the start.

- players do not receive all players in the same map
- interest area is a rectangular tile window
- the server determines which entities are visible
- the client creates, updates, and removes remote entities based on visibility

#### Initial Visibility Window

Initial player visibility window:

- width: 32 tiles
- height: 24 tiles
- centered on the player's current authoritative tile

This window is a runtime constant stored in `packages/config`.

#### Visibility Representation

Visible remote players are represented as per-client visible room state.

- room state remains schema-based
- per-client filtering uses Colyseus state-view mechanics
- only currently visible remote player entities are included in the client's visible state

If load testing shows per-client state filtering is too expensive, visibility transport may be reworked in a later design iteration, but the v1 plan assumes schema-driven visibility.

#### NPC Visibility

Static NPCs are not synchronized through room visibility in v1.

- they are compiled into map data
- they are rendered locally from shared map assets
- server authority still applies for collision and interaction validation

## 9. Movement Model

### 9.1 Core Movement Rules

- grid-based world logic
- no diagonal movement
- keyboard only in v1
- supported keys: arrows + WASD
- movement is continuous while a direction is held
- movement is visually smooth between tiles
- one-step input queue is supported

### 9.2 Authoritative Flow

The client does not send position.

The client sends input intent only:

- direction pressed
- direction released

The server:

- stores active movement intent
- validates collision and transitions
- advances movement in fixed simulation ticks
- updates authoritative room state

### 9.3 Tick Rate

- server simulation target: 20 ticks per second

### 9.4 Position Truth

The server stores tile coordinates as truth:

- `tileX`
- `tileY`
- direction
- movement-related state

The client converts authoritative tile state into pixel-space rendering.

### 9.5 Local Prediction

There is no client-side movement prediction in v1.

- local player movement begins only after server approval
- this reduces reconciliation complexity in the initial foundation

### 9.6 Remote Motion

Remote players are visually interpolated on the client for smoothness.

- server stays authoritative
- remote render motion is smoothed locally

## 10. Session and Identity

### 10.1 Guest Bootstrap Flow

Bootstrap flow:

1. client starts
2. client reads `guestToken` from local storage
3. client calls Fastify guest bootstrap endpoint with the token if present
4. server resolves or creates guest identity
5. server returns:
   - guest id
   - guest token
   - display name
   - last known map and tile state
6. client persists the returned token
7. client joins the correct Colyseus room using the resolved guest identity

The room layer must never create guest identity by itself. Identity creation and recovery begin at the HTTP bootstrap layer.

### 10.2 Guest Session

The initial player session is guest-based.

- guest token persists locally
- local persistence uses browser storage in v1
- token is sent explicitly during bootstrap/connection flow

### 10.3 Bootstrap Outcomes

Bootstrap outcomes must be explicit:

- missing token: create a new guest identity
- invalid or unknown token: create a new guest identity and replace local token
- valid token: restore existing guest identity and persisted world state
- persistence failure: do not enter gameplay; return retryable error to client

The system should not silently fall back to volatile in-memory guest identities if persistence fails.

### 10.4 Duplicate Session Policy

Only one active gameplay connection is allowed per guest identity in v1.

- if the same guest connects in a second tab or socket
- the newest successful gameplay connection becomes authoritative
- the previous gameplay connection is disconnected cleanly

This avoids duplicate-presence bugs and keeps identity ownership simple in v1.

### 10.5 Identity Data

Each guest has:

- technical guest id
- guest token hash
- display name

Display names are server-generated and incremental, such as:

- `Trainer1`
- `Trainer2`
- `Trainer3`

### 10.6 Reconnection

- reconnection window: 10 seconds
- if a player reconnects within the window, restore:
  - identity
  - display name
  - map
  - last valid tile position

Reconnection attempts must target the same room instance first.

- the previous room slot is reserved during the reconnection window
- base rooms stay available
- extra rooms with a pending reconnection reservation must not be destroyed until the window expires

If same-room reconnection is no longer possible after the reservation window:

- fall back to the first available instance for the same map
- restore the last valid tile if still legal
- otherwise place the player at the destination map spawn

## 11. Persistence Model

SQLite is used from the start.

Schema changes must be versioned with migrations from day one.

### 11.1 Persisted Player Data

Persist the following in v1:

- `guestId`
- `guestTokenHash`
- `displayName`
- `lastMapId`
- `lastTileX`
- `lastTileY`
- `lastDirection`
- `spawnMapId`
- `spawnTileX`
- `spawnTileY`
- `lastSeenAt`
- `createdAt`
- `updatedAt`
- `flagsJson`
- `preferencesJson`

### 11.2 Presence

Short-lived online presence may remain in memory/runtime structures, but durable identity and last-known world state must be persisted.

## 12. Colyseus State and Protocol

### 12.1 State Strategy

Authoritative continuous world state should use Colyseus Schema state.

Examples:

- visible players
- tile coordinates
- direction
- map-related state
- display name

### 12.2 Message Strategy

Manual messages are reserved for events/commands that are not continuous room state, such as:

- client movement intent
- bootstrap or error responses
- room-level control events

### 12.3 Type Safety

Client/server contracts should be shared and typed end-to-end.

- shared message types live in `packages/shared`
- room state types are explicitly modeled
- protocol constants are not duplicated across apps

## 13. Client Architecture

### 13.1 Client Boundaries

The client should be layered as:

- networking
- world state consumption
- entity presentation
- scene/rendering
- UI shell integration

The client must not become a single scene that owns:

- networking
- world truth
- entity registry
- rendering
- UI

### 13.2 Client Runtime Units

Client implementation units should be explicit and independently testable:

#### Session Client

Consumes:

- browser storage
- Fastify bootstrap endpoint

Produces:

- resolved guest identity
- room join bootstrap data

#### Room Client

Consumes:

- guest identity
- desired room join parameters

Produces:

- room connection lifecycle
- typed outbound command API
- typed inbound state/message subscription API

This unit owns Colyseus-specific transport details.

#### World Store

Consumes:

- room state callbacks
- room event callbacks

Produces:

- client-readable world snapshot
- visible entity registry
- local player authoritative state

This unit does not render and does not speak directly to browser storage or HTTP.

#### Entity Presenter

Consumes:

- world store snapshots
- compiled map metadata

Produces:

- render-ready entity state
- tween/interpolation instructions

#### Scene Controller

Consumes:

- render-ready entity state
- compiled map data
- input events

Produces:

- Phaser scene lifecycle
- camera behavior
- tilemap/layer rendering
- local command requests routed back to Room Client

#### UI Shell Bridge

Consumes:

- high-level game/session status

Produces:

- overlays
- dialogs
- future integration seam for React UI

### 13.3 Ownership Rules

- only Session Client touches browser storage
- only Room Client speaks Colyseus transport
- only Scene Controller touches Phaser scene objects directly
- only server code decides world truth
- World Store never mutates authoritative gameplay state by itself

### 13.4 UI Strategy

The game starts with Phaser-only rendering, but UI boundaries must be prepared for future React integration.

Initial expectation:

- Phaser handles gameplay rendering
- UI shell remains separable from gameplay
- future web UI can attach without rewriting the core game loop

### 13.5 HUD/UI Scope in v1

- minimal UI only
- connection/status/debug surfaces allowed
- no heavy web app UI in the first gameplay foundation

## 14. NPC and Interaction Model

### 14.1 NPC Scope

v1 includes static NPCs.

- they can block movement
- they exist as world entities
- no complex AI

NPC definitions live in compiled map data.

Each NPC definition should include at minimum:

- npc id
- map id
- tile position
- facing direction
- blocking flag
- interaction text id or inline text reference

### 14.2 Interaction Scope

v1 interaction is minimal.

- interaction key: `Space`
- basic text box/dialog surface
- enough to validate interaction flow without building a full dialogue system

Interaction rules:

- interaction is server-authoritative
- the server validates that the player is adjacent to the target NPC and facing a valid interaction tile
- the server resolves the interaction payload
- the client renders the returned dialogue/text box

Static NPCs do not require network synchronization in v1 because they are deterministic map content, but interaction validation still happens on the server.

## 15. Rendering and Layering

- top-down 2D presentation
- depth uses Tiled layer strategy plus simple entity layering
- no advanced dynamic depth system required in v1

Expected layer model:

- ground/below
- world blockers/objects
- player and NPC entities
- above-player overlay layers

## 16. Testing Strategy

Automated tests are required from the start, but kept intentionally minimal.

### 16.1 Included in Initial Test Suite

- grid logic
- collision validation
- map transition rules
- guest session creation/restoration
- persistence behavior
- room-level multiplayer behavior
- visibility window behavior
- reconnection behavior

Minimum acceptance assertions:

- blocked movement never changes authoritative tile position
- open movement changes authoritative tile position exactly one tile at a time
- transition triggers move the player to the configured destination map/spawn
- reconnect within 10 seconds restores identity and last valid location
- duplicate guest connection ejects the older active gameplay connection
- interaction with a valid adjacent NPC returns the expected interaction payload
- interaction with an invalid NPC target is rejected
- visibility window includes players entering the window and removes players leaving it

### 16.2 Excluded from Initial Test Suite

- heavy end-to-end browser automation
- full UI snapshot coverage
- complex performance suites

### 16.3 Load Testing

Load testing begins early with a simple baseline:

- connect simulated players
- join rooms
- issue movement intents
- measure stability and payload behavior

Minimum v1 load test target:

- 50 simulated players in one room instance
- sustained movement-intent traffic for at least 2 minutes
- no room crash
- no unhandled server errors
- no duplicated player identities
- no corrupted authoritative tile state
- players outside the interest window are not present in the client's visible player set

## 17. Observability and Operations

### 17.1 Logging

Use structured logging from the start.

Key events:

- guest bootstrap
- room join/leave
- room allocation
- reconnection
- map transition
- visibility churn
- persistence failures

### 17.2 Metrics

Initial metrics should cover:

- online players
- players per room
- room creation/destruction
- reconnect count
- transition count
- basic latency/processing indicators where practical

### 17.3 Deployment Shape

v1 deployment target:

- single server
- client build
- Fastify
- Colyseus
- SQLite

The code should be structured so infrastructure can be split later.

### 17.4 CI

CI is not implemented in the first step, but the project should be documented for future GitHub Actions support.

## 18. Failure and Edge Cases

The design must handle these cases explicitly:

- invalid guest token at bootstrap
- missing guest token at bootstrap
- corrupted local storage token
- SQLite read/write failure during bootstrap
- room join attempt after bootstrap success but before persistence refresh
- room full during map transition
- reconnect after reservation expiry
- reconnect after extra-room teardown
- map compile validation failure
- NPC interaction request against invalid npc id

Expected handling:

- fail fast with typed, retryable errors where possible
- never silently create volatile world truth when persistence is required
- fall back to safe spawn behavior when last position is invalid
- block deployment/runtime startup on invalid compiled map data
- if a room is full during a map transition, place the player in the first available instance for the destination map; if none exists, create a new extra instance
- if room join fails after bootstrap success, the client must retry room join using the already-issued bootstrap identity instead of reissuing guest creation

## 19. Runtime Configuration

Runtime constants belong in `packages/config`.

Initial required constants:

- server tick rate
- room capacity
- reconnection window
- visibility window width/height
- base room policy
- extra-room disposal policy
- interaction distance

## 20. Quality Standards

- TypeScript strict mode
- ESLint
- Prettier
- shared config package

Git hooks may be added later, but are not required for the first foundation step.

## 21. v1 Playable Milestone

The first playable milestone is complete when the project has:

- guest session persistence
- map loading from Tiled pipeline
- keyboard movement in grid with smooth tile-to-tile motion
- server-authoritative movement
- visible nearby players in real time
- proximity interest window
- map transitions
- static NPCs
- minimal NPC interaction
- SQLite persistence
- reconnection support
- initial automated tests
- initial load test coverage

The following are explicitly out of scope for this milestone:

- chat
- audio
- mobile
- combat
- inventory
- React UI

The milestone is accepted only when:

- all required automated tests pass
- the minimum load-test scenario passes
- a fresh guest can enter the world and move
- a returning guest can reconnect and restore identity/state
- transitions, NPC interaction, and visibility behavior match the configured rules

## 22. Future Extensions Already Anticipated

This foundation should make later additions straightforward:

- React-based UI shell
- chat
- richer NPC interaction
- account system
- inventory
- quests
- party/friend-aware room selection
- stronger persistence
- advanced scaling infrastructure

## 23. Risks and Mitigations

### 23.1 Risk: Overgrown Room State

If room state becomes too large, patch traffic can grow quickly.

Mitigation:

- keep state lean
- separate continuous state from event messages
- validate with load tests early

### 23.2 Risk: Map Authoring Drift

If authored maps are used without validation, collisions and transitions can drift.

Mitigation:

- compile/validate maps before runtime
- define strict metadata rules

### 23.3 Risk: Client/Server Boundary Erosion

It is easy for gameplay logic to collapse back into the client scene layer.

Mitigation:

- enforce package boundaries
- keep pure logic in shared packages
- keep world truth on the server

### 23.4 Risk: Capacity Assumptions

Even 50 players per room should be treated as a measured target, not a guaranteed constant.

Mitigation:

- build metrics and load tests early
- tune visibility windows and payload shape from evidence

## 24. Implementation Bias

When trade-offs appear during implementation, bias toward:

- correctness over shortcuts
- boundaries over convenience
- authoritative server truth over client convenience
- shared contracts over duplicated literals
- measured performance over guessed performance

## 25. Next Step

After this design is approved, the next step is to write a concrete implementation plan for the new `pokecheetos` foundation and then execute the rebuild in the new repository structure.
