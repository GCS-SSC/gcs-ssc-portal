# Private attachments

Storage is configured once per app, not by organizations or form designers. Without `S3_BUCKET`, files live in a private local directory; with `S3_BUCKET`, new files use the private S3 bucket. PostgreSQL/PGlite stores only metadata, lifecycle state, storage marker and object key. The provider exposes optional `attachments: {enabled: boolean}` on survey definitions. Claims and forecasts expose the same policy on each set item. Omitted means disabled. Publication freezes the policy with each form revision; files are associated with a response item and remain separate from survey answers.

## Configuration and operations

Local storage is the default. `ATTACHMENT_LOCAL_DIR` defaults to `.data/attachments` relative to the server working directory. The app creates the attachment directory with owner-only permissions and files with owner-only permissions. Use an absolute path on a persistent private volume in production. Keep it outside `public/` and `.output/public/`, mount it at the same path on restarts, and back it up with the database. Local storage is suitable for a single server with a persistent disk; replicas must share the same durable storage or use S3. A container's ephemeral filesystem will lose attachments when replaced.

To send new uploads to S3 later, set `S3_BUCKET`, `S3_REGION` (default `ca-central-1`, falling back to `AWS_REGION`) and optionally `S3_PREFIX` (default `portal-attachments`). `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE=true` support S3-compatible services. These are server runtime settings. Use the [AWS SDK credential provider chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html), preferably a workload IAM role; standard AWS environment credentials also work. Never place credentials in public Nuxt configuration. Existing local files remain in the local directory and continue to be read and cleaned up there after S3 is enabled; retain the directory and backups until those records are migrated or removed. This change does not migrate old local objects into S3.

Provision the bucket separately and block public access. The workload needs `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on its configured prefix. Browser clients never access S3 directly, so bucket CORS is unnecessary. Bucket encryption is an operator setting. The app does not set public ACLs or issue presigned URLs. Restart after changing settings.

Limits are app-wide: `ATTACHMENT_MAX_BYTES` defaults to 10 MiB (maximum 25 MiB); `ATTACHMENT_MAX_FILES_PER_FORM` defaults to 10 (maximum 20); `ATTACHMENT_MAX_RESPONSE_BYTES` defaults to 50 MiB (maximum 250 MiB). Positive integer values are required. Pending uploads count toward limits. Empty files are rejected.

The running app attempts cleanup every 15 minutes, at most 100 eligible objects per pass. Only detached objects or pending reservations older than one hour qualify. Failed deletions retain metadata for retry. Replicas may issue duplicate idempotent S3 deletes for detached rows; removal counts reflect only metadata rows actually deleted. No distributed exactly-once claim is made. `bun run attachments:cleanup` provides a manual pass with the same configuration; stop a PGlite server before using this separate process. PostgreSQL can run it concurrently. The one-hour grace exceeds the 60-second S3 upload deadline and protects against late completion of interrupted uploads. Submitted attachments are never selected for cleanup.

Back up the database and all active attachment storage, local and S3. Do not apply an age-based expiration policy to the active attachment prefix. If bucket versioning is enabled, configure noncurrent-version retention deliberately: normal deletion adds a delete marker and does not purge retained versions. Bucket names and object keys are persisted so a new bucket can receive new files while old buckets remain readable through the same endpoint/credentials. Moving endpoints requires migrating the old objects as well. No file content inspection or malware scanning is implemented; downloads are always forced as binary attachments and never embedded as active content.

## Lifecycle and authorization

Upload preflight authenticates, parses metadata and checks contributor permission, draft revision, published item policy and current call dates/revision before reading the bounded body. Reservation repeats checks under the organization lock, enforces aggregate limits, records a pending random object key and increments the response revision. S3 PUT happens outside the database transaction. Finalization rechecks mutable access and state before marking the file ready. Failed/conflicting uploads detach the reservation for cleanup; callers must reload the response revision before retrying.

Contributors can add/remove individual files while editing drafts. Only managers can submit or delete whole drafts. Pending uploads block review/submission. Deleting a file/draft immediately removes portal access and retains private storage metadata until cleanup. Final submission freezes file IDs, names, sizes and SHA-256 checksums into the immutable export.

An awaiting-documentation response also accepts files through the same upload route with reserved item ID `!documentation`, which cannot collide with a published form item ID, independently of published form attachment policies. Contributors can stage files and include them with a follow-up message or send files alone. Files are visible to government only after the follow-up is sent; sent files cannot be removed. An unsent staged file is detached for cleanup if government closes the documentation request. The original export never changes.

Agency-scoped integration tokens may stage files at `POST /api/government/submissions/:submissionId/attachments?filename=…&expectedRevision=…` and attach them to a government message through `POST /details`. A staged government file is invisible to organization members until sent. The agency may remove its own unsent file through `DELETE /attachments/:attachmentId`; neither side can remove a sent file or claim the other side's staged file. Government and organization message authorship is stored separately from portal user IDs. The same app-wide size and count limits apply.

Organization downloads require the response's subject viewer permission. Government downloads require a submitted response and fresh agency authority (integration token). The server verifies the stored length and SHA-256 before returning bytes with `Content-Disposition: attachment`, `application/octet-stream`, `nosniff`, `no-store` and CSP sandbox. Object locations are never exposed through organization APIs.

## API

Organization routes start `/api/organizations/:organizationId/responses/:responseId`:

| Method/path                                                   | Contract                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------ |
| POST /items/:itemId/attachments?filename=…&expectedRevision=… | Raw file bytes; `{revision,attachments}`. Browser Origin required. |
| GET /attachments/:attachmentId                                | Authenticated private download.                                    |
| DELETE /attachments/:attachmentId                             | JSON `{expectedRevision}`; `{revision,attachments}`.               |

Government routes: `GET /api/government/submissions/:submissionId/attachments/:attachmentId` downloads a submitted file; `GET /api/government/submissions/:submissionId/response` returns a read-only response with frozen balances and file metadata. Response reads include `attachments` and `attachmentLimits`. Each metadata entry includes `id`, `itemId`, `status`, `filename`, `size`, `sha256`, and `createdAt`.

Browser verification uses a disposable, digest-pinned MinIO container with a private bucket; no operator AWS credentials or real bucket are used. It tests GC Design System, actual S3 PUT/GET, unauthorized public access, permissions, revision updates without losing unsaved answers, removal, submission, and agency-key download.
