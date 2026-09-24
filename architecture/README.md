# Architecture

This directory contains a reusable architectural baseline adapted from the sibling `gcs-ssc` repository's agent guide and concern-specific architecture documents. It is maintained locally and has no runtime dependency on that repository.

The portal now implements account registration, organizations, additive member permissions, ownership transfer, expiring invitations, and GC Design System. See the overview and implementation-specific contracts below; reusable guidance remains applicable.

## Reading guide

| Document                                                   | Concern                                                              |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| [gcdesign.md](gcdesign.md)                                 | Official GCDS component policy, page composition, and migration gaps |
| [ui-components.md](ui-components.md)                       | GC Design System integration components and contracts                |
| [overview.md](overview.md)                                 | Boundaries, reference organization, and decisions still to make      |
| [frontend.md](frontend.md)                                 | Client structure, reactive state, and request ownership              |
| [ui-patterns.md](ui-patterns.md)                           | Pages, tables, lookups, and recovery behavior                        |
| [required-fields.md](required-fields.md)                   | Validation, required indicators, and accessible controls             |
| [i18n.md](i18n.md)                                         | Locale and message ownership when localization is enabled            |
| [backend.md](backend.md)                                   | Request processing, transactions, and errors                         |
| [auth.md](auth.md)                                         | Authentication, authorization, and trust boundaries                  |
| [data-model.md](data-model.md)                             | Schema evolution, integrity, identifiers, and precision              |
| [compatibility-boundaries.md](compatibility-boundaries.md) | Request contracts and supported persisted data                       |
| [testing-and-tooling.md](testing-and-tooling.md)           | Verification, test isolation, and analysis tools                     |

## Adaptation boundary

The imported principles cover separation of concerns, typed contracts, server authorization, safe migrations, accessible forms, localization ownership, reliable client state, and verification.

The source project's grants terminology, entities, role and assignment rules, database prefixes, extension SDK, component and helper implementations, private tooling setup, deployment configuration, audit history, review snapshots, and machine-specific paths were omitted. Framework-specific advice is conditional; package versions, scripts, providers, and supported languages remain project decisions.

Update the relevant document whenever a change alters a runtime boundary, request path, schema relationship, security invariant, or public contract. Prefer links to actual source paths and named symbols once they exist. Historical verification from another project is not verification of this one.

- [Government administration and funding API](government.md)

- [Headless surveys, form authoring and import API](surveys.md)

- [Cases, claims, forecasts and form sets](cases.md)

- [Funding applications](applications.md)
- [Private S3 attachments](attachments.md)
