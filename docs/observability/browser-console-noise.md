# Browser Console Noise Classification

Use this when debugging local client startup. Not every red browser-console line is a PokeCheetos bug.

## Ignore

These are usually extension, browser, or local privacy-tool noise unless they line up with a user-facing failure:

| Pattern | Typical source | Action |
| --- | --- | --- |
| `Unchecked runtime.lastError` | Browser extensions | Ignore unless the app UI is broken in the same step |
| `ERR_BLOCKED_BY_CLIENT` on ad/tracker domains | Ad blockers or privacy extensions | Ignore for app debugging |
| CSP warnings for extension scripts | Browser extensions injecting content scripts | Ignore for app debugging |

## Investigate Soon

These may not block startup every time, but they often point to local environment drift:

| Pattern | Typical source | Action |
| --- | --- | --- |
| `WebSocket connection ... failed` | Colyseus server not listening or wrong endpoint | Check `VITE_ROOM_ENDPOINT` and server startup |
| `Failed to fetch` with no structured client error code yet | Server offline, wrong port, or browser-level block | Cross-check the mapped bootstrap error in the UI/console |
| `blocked by CORS policy` | Fastify CORS origin mismatch | Verify client origin and Fastify CORS allowlist |

## Actionable App Errors

These should be treated as real application issues and mapped to stable observability codes:

| Error code | Meaning | First check |
| --- | --- | --- |
| `BOOTSTRAP_FAILED` | Fastify bootstrap route returned a typed failure | Server logs for `event=guest_bootstrap` and matching `requestId` |
| `NETWORK_FETCH_FAILED` | Browser could not reach the bootstrap route | Server running, correct API origin, no proxy mismatch |
| `CORS_BLOCKED` | Browser refused the bootstrap request before app code could recover | Fastify CORS config for the current client origin |
| `ROOM_CONNECT_FAILED` | Guest bootstrap succeeded but world-room join failed | Colyseus server status, room endpoint, join diagnostics |
| `SEAT_RESERVATION_EXPIRED` | Join reservation expired before world entry completed | Room allocation timing and reconnect/join timing |
| `UNKNOWN` | Error did not match a known class yet | Inspect console payload and extend the mapper if recurring |

## Practical Triage Order

1. Check the on-screen/client-reported error code first.
2. Find the matching structured server log by `requestId` when bootstrap reached the server.
3. Ignore extension-only noise unless it reproduces in a clean browser profile.
4. Promote recurring `UNKNOWN` errors into a named client error code instead of leaving them ad hoc.
