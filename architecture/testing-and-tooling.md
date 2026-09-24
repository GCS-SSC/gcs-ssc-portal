# Verification

`package.json` defines the supported commands. Bun installs the locked dependencies; TypeScript and Nuxt typecheck both client and server. ESLint covers authored code.

```sh
bun run lint
bun run typecheck
bun run test:unit
bunx playwright install chromium
bun run test:e2e
```

Vitest covers separate administrator provisioning, agency isolation, call publication, explicit application access, credential expiry/revocation, upgrading populated databases, configuration validation, real authentication, body limits, database-backed organization/permission/invitation behavior, concurrent invitation acceptance, GCDS integration boundaries and translation contracts. The PGlite adapter leases its single connection for a complete transaction so parallel operations cannot interleave transactional state.

Playwright runs the user journeys against the GC Design System production artifact. `test:e2e` builds the application before running the suite. Do not run simultaneous builds or rebuild `.output` while a verification server is using it.

Browser tests use a dedicated local server and disposable database. The runner creates a test-only administrator before starting the server. Browser journeys exercise agency/key provisioning, machine publication, applicant access, and GC Design System. Separate organization journeys pause across the production authentication rate-limit window because all test clients share the loopback peer address. Existing app databases and generic `DATABASE_URL` values must never be reused for destructive verification. Integration tests own their data and cleanup. Test runner artifacts and traces are ignored.

Check the running production artifact, not just the development server: dependency tracing, vendor control registration, shadow-DOM events, native form submission and secure-cookie behavior differ from isolated unit tests. Shared-control changes warrant rendered required/label/error assertions and representative browser recovery.

Graphs and static analysis are navigation aids. Inspect callers and runtime behavior before concluding that code is unused or a boundary is safe. Preserve meaningful assertions; coverage alone is not completion evidence.

## Dependency compatibility

The lockfile and package overrides keep Kysely at 0.28.17: the embedded adapter imports the migration API exported by that series. A mixed 0.28/0.29 dependency tree can otherwise produce a production artifact with the wrong exported API. Production browser startup verifies the packaged dependency.

The esbuild override uses 0.28.1 to include the [Windows development-server traversal fix](https://github.com/evanw/esbuild/releases/tag/v0.28.1). The production build and the full verification suite must pass after updating either override.
