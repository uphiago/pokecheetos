# Foundation Stabilization Design

Date: 2026-03-13
Status: Draft for review

## 1. Context

The current `pokecheetos` monorepo has a sound high-level architecture, but the workspace cannot yet be treated as a reliable baseline for further runtime work.

Current issues observed in the active branch:

- `pnpm lint` reports success without executing package-level lint tasks
- `pnpm typecheck` fails in the client test surface because `jsdom` typings are missing
- `pnpm test -- --no-cache` fails in the maps package because transition expectations drifted from the compiled map artifacts
- release-readiness documentation no longer matches the actual workspace state

These issues reduce confidence in future runtime changes because regressions cannot be separated cleanly from pre-existing instability.

## 2. Goal

Restore trust in the monorepo baseline so future work can build on real quality gates instead of false green signals.

At the end of this stabilization pass:

- `pnpm lint` must execute meaningful checks and pass
- `pnpm typecheck` must pass
- `pnpm test -- --no-cache` must pass
- map-related tests and artifacts must agree on transition behavior
- `docs/release-readiness.md` must reflect the post-fix reality

## 3. Scope

### In Scope

- add real workspace lint coverage
- fix the current client typecheck failure related to `jsdom`
- investigate and fix the current map transition test/artifact drift
- define the minimum safe map source-of-truth behavior for this phase
- update release-readiness documentation to match verified commands and outcomes

### Explicitly Out of Scope

- persistent on-disk guest/session storage
- wiring the real player repository into the Colyseus room runtime
- room allocation / overflow / reconnect orchestration changes
- new health/readiness/diagnostic endpoints
- transport-level or multiplayer behavior redesign

## 4. Design Principles

- Fix confidence first, architecture second
- Prefer the smallest change that restores a truthful baseline
- Do not mix runtime feature work with stabilization work
- Make quality gates reflect reality, even when the result is "still blocked"
- Preserve existing monorepo boundaries; do not refactor unrelated subsystems

## 5. Problem Breakdown

### 5.1 Workspace Quality Gates

The root workspace advertises `lint`, `typecheck`, and `test`, but only `typecheck` and `test` currently exercise package-level tasks in a meaningful way. `lint` currently returns green without package implementations.

This stabilization pass will make the root commands trustworthy:

- `apps/client`, `apps/server`, `packages/config`, `packages/shared`, `packages/maps`, and `packages/testing` must expose real `lint` scripts in this phase
- the root `pnpm lint` must fan out through Turbo and execute those scripts
- documentation must stop calling a no-op lint result a pass

Minimum acceptable lint behavior in this phase:

- TypeScript source packages must be checked by ESLint
- packages with no separate runtime source beyond config exports must still participate through an explicit script, even if the script is intentionally narrow
- no package in the Turbo scope may remain silently skipped

### 5.2 Client Typecheck Failure

The current failure is caused by `apps/client/src/ui/ui-shell-bridge.test.ts` importing `jsdom` without type declarations installed or otherwise declared.

This pass will fix the failure with the narrowest safe change:

- either add the missing type dependency
- or add an explicit local declaration only if that is the established pattern in the repo

The choice must keep `tsc` honest rather than suppressing the problem globally.

### 5.3 Map Transition Drift

The current maps test expects a transition at one tile while the checked-in compiled artifact exposes a different tile key. The client also loads public Tiled JSON assets separately from the server/test runtime compiled maps.

This pass will not redesign the full map pipeline. It will:

- identify which representation is authoritative for transition tests in the current architecture
- align the failing test and checked-in artifacts to that authority
- document the temporary contract clearly enough that future work does not reintroduce silent drift

Client/public map assets are in scope only as a verification surface, not as a pipeline redesign target.

That means this phase must do exactly one of the following:

- verify the client public assets already remain compatible with the corrected transition contract and leave them unchanged, or
- update the checked-in client public assets only if the evidence shows they are already inconsistent with the corrected authored/compiled contract

This phase must not introduce a new client asset loading pipeline.

This means choosing one of these outcomes:

1. The authored map is correct, so compiled artifacts and tests are regenerated/aligned to it.
2. The compiled artifact is correct for runtime, so the failing test is updated to match it.

The decision must be evidence-based from the existing pipeline, not guessed from intent.

### 5.4 Operational Documentation

`docs/release-readiness.md` currently records historical pass states that no longer match the active branch. This makes the document unsafe as a handoff artifact.

This pass will update it to reflect:

- the real command set in this repository
- the real outcomes verified after stabilization
- any remaining environment-specific blockers that still prevent full-stack smoke

## 6. Proposed Approach

### Recommended Approach: Stabilization-First

Treat this work as baseline repair, not feature delivery.

Execution order:

1. restore real lint coverage
2. fix typecheck failure
3. root-cause the map transition failure
4. update docs only after commands have been re-verified

This approach is preferred because it minimizes coupling. Once these gates are truthful, subsequent runtime work can use them as non-negotiable verification.

### Rejected Alternatives

#### Runtime-First

Fix persistence and room allocation first, then clean up the gates later.

Rejected because it adds high-risk runtime changes on top of a workspace that currently cannot prove its own health.

#### Big-Bang Alignment

Fix quality gates, persistence, allocation, and observability in one pass.

Rejected because it combines independent problem domains and would make failures harder to isolate and review.

## 7. File and Unit Impact

Likely files to modify in this phase:

- root/package manifests for real lint orchestration
- package manifests in `apps/client`, `apps/server`, `packages/*` that need lint scripts
- client typing surface for `jsdom`
- maps tests and possibly generated/authored map artifacts if evidence shows artifact drift
- `docs/release-readiness.md`

Likely files to inspect carefully before edits:

- `apps/client/src/ui/ui-shell-bridge.test.ts`
- `packages/maps/src/runtime/transitions.test.ts`
- `packages/maps/authored/*.json`
- `packages/maps/generated/*.json`
- `apps/client/src/scenes/boot-scene.ts`
- `packages/maps/src/compiler/write-compiled-maps.ts`

## 8. Verification Strategy

Verification for this subproject is command-driven:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test -- --no-cache`

All three commands are required to pass for this subproject to be considered complete.

If an environment-specific limitation still blocks verification outside these commands, the documentation must record that limitation truthfully rather than masking it. That allowance applies only to sandboxed runtime smoke checks such as local port binding, not to `lint`, `typecheck`, or `test`.

Additional targeted verification:

- rerun the previously failing map transition test directly during debugging
- rerun the previously failing client typecheck surface directly during debugging

## 9. Risks and Controls

### Risk: Over-correcting the map pipeline

If stabilization turns into a map architecture redesign, the scope will slip.

Control:

- only fix the current failing contract
- defer any broader unification of client/public and server/compiled map assets to a later spec

### Risk: Hiding type issues instead of fixing them

Quick ambient declarations can make `tsc` pass while reducing safety.

Control:

- prefer explicit typings over broad suppression
- do not weaken compiler settings for the whole package to solve one import

### Risk: False confidence from documentation edits

Docs can be updated without commands being rerun.

Control:

- update readiness docs only after the commands are executed again
- use exact command results from the current branch state

## 10. Success Criteria

This stabilization design is complete when:

- the workspace quality gates are real, reproducible, and green for `lint`, `typecheck`, and `test -- --no-cache`
- the current known failures are fixed rather than reclassified as accepted blockers
- the resulting diff is limited to baseline trust restoration, not runtime feature expansion
