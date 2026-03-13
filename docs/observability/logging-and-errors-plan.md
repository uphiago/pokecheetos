# Logging and Error Handling Plan (Incremental)

## Goal

Reduce noisy crashes in local/dev runtime, improve troubleshooting speed, and make errors actionable for both user-facing UX and developer debugging.

## Immediate pain points observed

- Browser console receives mixed noise from extensions/ads/security policies.
- Runtime errors (CORS, seat reservation, schema serialization) are not clearly grouped by root cause.
- Server logs do not consistently include context (request id, guest id, room id, phase).
- Client shows generic failures (`Failed to fetch`) without structured diagnosis.

## Phase 1 — Quick Wins (now)

### 1) Error classification on client

Add a tiny error mapper in client bootstrap:

- `NETWORK_FETCH_FAILED`
- `CORS_BLOCKED`
- `SEAT_RESERVATION_EXPIRED`
- `ROOM_CONNECT_FAILED`
- `BOOTSTRAP_FAILED`
- `UNKNOWN`

Display user-facing message + keep technical detail in console with `code` and `cause`.

### 2) Structured server logs

Standardize server logs as JSON with these fields:

- `level`
- `message`
- `event`
- `requestId`
- `guestId`
- `roomId`
- `mapId`
- `phase` (bootstrap/join/simulate/interact/leave)
- `errorCode`
- `errorStack` (dev only)

### 3) Correlation ID

Generate `requestId` in HTTP route and propagate to room join context where possible.

### 4) Noise filter in docs

Document known ignorable browser logs (extension/adblock warnings) to avoid false alarms.

## Phase 2 — Runtime resilience

### 5) Retry policy with capped backoff

For room connect/reconnect:

- 2–3 retries
- short backoff
- stop with typed final error

### 6) Better room join diagnostics

When join fails, log:

- endpoint used
- roomName
- roomIdHint
- server close code
- reservation window status

### 7) Health/diagnostic endpoints

Add:

- `/health` (already exists)
- `/health/ready` (deps check)
- `/diag/runtime` (lightweight runtime metadata in dev)

## Phase 3 — Observability maturity

### 8) Error budget dashboard (dev-first)

Track counters in memory/log stream for:

- bootstrap failures
- room join failures
- reconnect failures
- simulation exceptions

### 9) Optional external sink

Pluggable future sink (e.g. Sentry/Logtail) behind feature flag.

## Suggested execution order

1. Client error mapper + better bootstrap messages
2. Structured server log context fields
3. Join/reconnect diagnostics
4. Readiness/diag endpoints

## Definition of done (for this initiative)

- Any user-reported crash can be mapped to a stable error code.
- Logs include enough context to reproduce (guest/room/phase/request).
- Console noise is documented with “ignore vs action” guidance.
- Time-to-root-cause is significantly reduced in local/dev environment.
