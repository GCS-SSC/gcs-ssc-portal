# Validation and compatibility boundaries

Validation serves different purposes at different boundaries.

| Boundary                      | Required behavior                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| New request or authoring save | Apply the current strict schema and return the defined field-level failure contract.          |
| Supported persisted data      | Normalize only documented older shapes whose meaning is unambiguous, then validate.           |
| Corrupt persisted data        | Return an explicit safe failure; never silently replace authored content with an empty value. |

Before tightening a persisted-data parser, inventory shapes produced by supported migrations, seeds, and writers. Distinguish valid current data, unambiguously normalizable older shapes, intentionally unauthored values, and corruption. Preserve immutable snapshots according to their versioned contract.

Superseded internal APIs do not require compatibility layers unless the project has promised that compatibility. Removing an old API contract does not authorize losing supported persisted data or breaking independently supported clients.

## Cross-layer change protocol

For a request or response change, inventory and update:

1. Server schemas, routes, and response projections.
2. All application and independently owned package callers.
3. Client hydration, defaults, empty values, and partial-update semantics.
4. IDs, precision, pagination, filters, and totals where affected.
5. Error codes, localization, conflict handling, retries, and idempotency.
6. Direct API tests, fixtures, seeds, and affected browser journeys.

Verify the route boundary and at least one actual caller. A workflow-controlling change also needs a successful user journey. A passing server-only schema test does not prove a complete contract change.
