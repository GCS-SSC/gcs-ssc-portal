# Testing and tooling

No package scripts or test runners are configured yet. Add and document commands when the application stack is initialized; copied command names are not working tooling.

## Verification layers

- Unit tests cover pure rules, schemas, response mapping, and isolated component behavior.
- Database integration tests cover real constraints, transactions, migrations, and concurrent operations.
- Browser tests cover important user journeys, rendered accessibility, request recovery, and locale behavior when enabled.
- Framework type and build checks verify generated aliases, bundling boundaries, and target compatibility.

Select checks based on the changed behavior and its risks. Preserve configured coverage thresholds, but treat coverage as a signal rather than proof. Report unavailable dependencies and skipped checks explicitly.

## Ownership and isolation

Packages own their implementation tests. Application integration tests verify public package contracts. Avoid duplicate suite discovery across workspaces.

Use explicitly designated disposable databases for destructive tests. An ordinary application database URL is not permission to reset its contents. Keep test resources isolated and clean up only resources owned by the runner.

When browser tests depend on build artifacts, ensure they exercise current code and coordinate shared artifact writers. Respect embedded database single-owner requirements if such a database is selected; mocks cannot prove production locking behavior.

## Analysis and evidence

Use source search and direct reads first. Structural graphs and static analyzers help locate callers and dependencies, but generated routes, auto-imports, templates, dynamic registration, and string-based relationships can hide edges. Missing graph edges are not proof of unused code.

Keep regenerable reports and local indexes out of architectural ground truth. Record verification for the actual change and environment, rather than carrying over results from the source repository.
