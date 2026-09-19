# Portal completion plan

The release scope is a usable companion portal with its own identity and storage, two build-time themes, and public contracts ready for a later GCS–SSC extension. The sibling application is outside this release.

| Workstream | Completion outcome | Verification |
| --- | --- | --- |
| Organization onboarding | Register, create a UUIDv7 organization, invite colleagues, change permissions, transfer ownership | Lifecycle/concurrency integration tests and browser journeys |
| Government workspace | Root provisions independent staff; staff maintain scoped agencies, programs, streams and published calls | Authorization tests, scoped integration API tests and browser journey |
| Shared surveys | Public installed package; bilingual questions/options/descriptions, pages/sections/subsections and forward branching; themed designer and renderer | Provider tests and both-theme design/import/response journeys |
| Funding applications | Published pinned forms, date-aware shared drafts, contributor editing, manager final submission and government review | Application integration and both-theme browser tests |
| Cases and form sets | Manual/API configuration, ordered survey/claim/forecast items, organization and case forms, typed permissions | Database and financial workflow browser tests |
| Reconciliation | Stable foreign IDs, exact money, source budgets/balances, warning-and-allow manager submission, immutable exports | Financial/lineage/revision integration tests |
| Attachments | App-wide private S3 settings, opt-in per form/item, authorization, CAS-safe upload/removal, final evidence and cleanup | Lifecycle tests and private MinIO in both-theme browser journeys |
| Operational handoff | Environment example, migrations, root bootstrap, S3/backup guidance, user workflow guide, clean main branches | Lint, typecheck, PostgreSQL, PGlite, both production builds and independent review |

Execution order: finish attachment integration; audit all journeys against these outcomes; repair concrete gaps and stale guidance; run the release checks; push the private portal and public provider to main; notify completion through Pushover. Any new defect found during checks reopens the affected workstream. Test logs are generated artifacts, not authored source.

The completion audit found no missing requested domain workflow beyond the application persistence and attachment work now being delivered. It identified stale preview-only documentation and a missing pre-body attachment validation check; both are corrected. The S3 fixture must shut down gracefully between sequential theme runs so disposable test storage is removed.

Operator setup still requires real deployment environment values, durable database storage, a private S3 bucket/credentials and root bootstrap. No production deployment or live bucket provisioning is implied by pushing source. Email delivery, GCS–SSC extension implementation, remote submission acknowledgement, new survey control types and application adjudication are outside the specified scope.
