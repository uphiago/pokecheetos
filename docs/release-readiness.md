# Release Readiness

Use this guide before cutting or handing off a release candidate.

## QA Matrix

| Area | Verification | Status | Notes |
| --- | --- | --- | --- |
| Workspace bootstrap | `pnpm install` | Blocked in sandbox | Fresh install hit `EAI_AGAIN` against the npm registry in this environment. |
| Static analysis | `pnpm lint` | Pass | Exit 0 on March 13, 2026. Turbo reported no package `lint` tasks to execute. |
| Type safety | `pnpm typecheck` | Pass | Exit 0 on March 13, 2026 with 6/6 package typecheck tasks successful. |
| Automated tests | `pnpm test` | Pass with environment workaround | Verified on March 13, 2026 via `pnpm exec turbo run test -- --no-cache` because the sandboxed shared install made Vitest cache writes fail under the default command. |
| Package smoke | `pnpm --filter @pokecheetos/testing test -- packages/testing/src/smoke/workspace-smoke.test.ts` | Pass with environment workaround | Verified on March 13, 2026 via `pnpm --filter @pokecheetos/testing exec vitest run --no-cache src/smoke/workspace-smoke.test.ts`. |
| Server boot | `pnpm --filter @pokecheetos/server dev` | Blocked in sandbox | `tsx src/index.ts` hit `EPERM` creating its IPC pipe; direct boot reached app startup and then hit `listen EPERM` on `0.0.0.0:3001`. |
| Client boot | `pnpm --filter @pokecheetos/client dev` | Blocked in sandbox | Verified startup reaches the bind step, then `vite` hits `listen EPERM` on `127.0.0.1:5173`. |
| Full-stack smoke | Run client and server together, then stop both cleanly | Blocked in sandbox | This environment does not allow local port binding, so the integrated smoke cannot complete here. |

Update the `Status` and `Notes` columns with actual verification evidence for the candidate you are evaluating.

## Release-Readiness Checklist

### Workspace Validation

- [ ] `pnpm install` has been run in the target environment so workspace dependencies are present.
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm --filter @pokecheetos/testing test -- packages/testing/src/smoke/workspace-smoke.test.ts`

### Full-Stack Smoke

- [ ] Start the server dev process: `pnpm --filter @pokecheetos/server dev`
- [ ] Start the client dev process in a second terminal: `pnpm --filter @pokecheetos/client dev`
- [ ] Verify both processes boot without immediate startup errors.
- [ ] Stop both dev processes cleanly after the boot check completes.

## Notes

- Run the full-stack smoke in an environment that allows local port binding.
- If the workspace is freshly checked out, complete `pnpm install` before attempting the smoke step.
- If you must verify from a sandboxed shared install, prefer the no-cache Vitest invocations recorded above so Vitest does not try to write under a readonly `node_modules` tree.
