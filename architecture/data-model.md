# Data modeling and migrations

## Schema contracts

Choose naming, identifier representation, deletion semantics, ownership, and audit requirements for this project. Keep database types, validation, API transport, and UI models consistent with those choices. Do not import source-project table names or namespace prefixes.

Use database foreign keys, uniqueness, nullability, and check constraints for structural invariants. If polymorphic identities are needed, preserve both type and identity and enforce their relationship rather than trusting unrelated identifiers.

Specify numeric precision and transport deliberately. Values outside JavaScript's safe integer range require lossless representation. Exact decimal amounts require exact arithmetic and an explicit rounding policy; ordinary floating-point arithmetic must not silently define financial behavior.

## Evolution

Use ordered incremental migrations for an existing schema and preserve supported rows and retained evidence. Only rewrite initial migrations when the project's clean-slate status makes it safe and the task authorizes that approach.

Keep migration history executable when shared helpers evolve. Renames require checking constraints, indexes, stored functions, triggers, seeds, generated types, queries, response projections, and any audit metadata.

Verify both a clean database and a populated upgrade. Test rollback when it is supported; otherwise document the recovery approach. Constraints, isolation, and locking that depend on a specific database engine need integration tests against that engine.

Seeds are executable consumers of application contracts. Verify representative seeded behavior in addition to successful insertion. Follow [compatibility-boundaries.md](compatibility-boundaries.md) before tightening parsers for stored values.
