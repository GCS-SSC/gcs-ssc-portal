# Backend conventions

## Request boundaries

Handlers compose input parsing, access checks, resource loading, business operations, and response mapping. Reuse typed schemas and error helpers once they exist. Establish validation and authorization ordering deliberately to avoid leaking inaccessible resource details.

Treat bodies, route parameters, queries, uploaded metadata, and integration payloads as untrusted. Reject malformed inputs at the appropriate boundary and preserve meaningful field paths. Centralize stable error codes and safe client messages; do not disguise unexpected exceptions as validation failures.

## Transactions and concurrency

Use a transaction for multi-table changes that must succeed together. Define consistent lock ordering for overlapping operations. For sensitive writes, reload mutable authority and state within the transaction and recheck them before mutation.

Enforce invariants with database constraints as well as useful application validation. Handle expected uniqueness and conflict failures explicitly. Use revision checks or equivalent concurrency control where stale clients could overwrite newer changes.

Document retry and idempotency behavior for external effects. A database transaction cannot by itself make an external API call atomic.

## Runtime ownership

Make database connection ownership, startup initialization, readiness, and shutdown explicit. Do not serve requests against a partially migrated schema. Reuse resources within their actual process/worker boundary; module state is not cross-worker coordination.

Redact credentials and sensitive request data from errors and logs. Introduce durable background processing only when requirements justify it, with clear retry and failure ownership.
