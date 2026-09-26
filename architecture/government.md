# Administrator access and agency integration

The companion portal does not authenticate government officials. Configuration for programs, streams, calls, surveys, agreements, and submission sets is supplied by the future GCS–SSC extension through agency-scoped bearer credentials. Organization users retain their own Better Auth accounts and cannot access administrator or integration APIs.

## Administrators

Administrators sign in at `/admin/login`. Their credentials live in `administrator`, separate from Better Auth's `user`, `account`, and `session` tables. Administrator sessions use random, hashed tokens in `administrator_session`, a dedicated HTTP-only cookie, a seven-day expiry, a ten-attempt-per-address-and-email login limit per 15 minutes, and canonical-Origin checks on writes. Multiple administrators are allowed. The demo seed creates `admin@portal.com` with the documented demo password. Production administrators can currently be created with `bun run admin:create` and `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`; a first-launch provisioning flow is planned. There is no public administrator registration or staff invitation flow.

The administrator UI at `/admin` registers agencies with bilingual names and shows their IDs. `/admin/integrations` issues and revokes agency-scoped keys. Each key has a name and expiry of 1–365 days (default 90); its random secret is displayed once and only its SHA-256 hash is stored. Administrator routes are `/api/admin/session`, `/login`, `/logout`, `/agencies`, `/agencies/:id` (PATCH), and `/integration-tokens` (GET/POST/DELETE by ID). Administrator cookies do not authorize `/api/government` or organization routes.

Migration `006_administrators` adds the separate administrator tables and revokes preexisting government staff sessions and password accounts. Legacy `government_user` records remain as tombstones so former staff cannot enter organization routes or accept organization invitations. No staff access or invitation endpoint remains. Existing agencies, calls, submissions, keys, and organization data are preserved.

## Extension API

Every `/api/government/*` request requires `Authorization: Bearer gcs_…`. Missing, invalid, expired, or revoked credentials return 401. A key can manage only its agency's configuration and read that agency's submitted exports. It cannot create an agency, issue keys, or access organization APIs. Write transactions recheck and lock the key before mutating data. Foreign browser Origins are rejected; bodies are bounded at 16 KiB or 256 KiB for survey, agreement, and set writes. Responses are `no-store`.

The agency hierarchy is `agency → program → stream → funding_call`. Calls start as drafts and are published explicitly. Published calls are visible to organization members with an explicit `application:viewer` or higher permission; ownership and `admin` alone do not grant it. See [surveys](surveys.md), [agreements](agreements.md), and [applications](applications.md) for the remaining machine contracts.

| Method/path after `/api/government`                                   | Purpose                                      |
| --------------------------------------------------------------------- | -------------------------------------------- |
| GET /agencies, GET /agencies/:id                                      | List and read agencies within key scope      |
| PATCH /agencies/:id                                                   | Update the key's agency                      |
| POST /programs, PATCH /programs/:id                                   | Manage programs in the key's agency          |
| POST /streams, PATCH /streams/:id                                     | Manage streams in the key's agency           |
| POST /calls, PUT /calls/:id, PATCH /calls/:id/publication             | Manage and publish calls                     |
| GET/POST/PUT surveys and call survey assignment                       | Manage pinned form definitions               |
| GET/POST/PUT agreements and sets, agreement balances, set publication | Manage agreement configuration and form sets |
| GET agency submissions and submission exports/attachments             | Retrieve submitted data                      |
| PUT submission status; POST submission details and attachments        | Request documentation and send replies       |

The future extension should keep each returned portal ID and reconcile before retrying an ambiguous create request; creation is not idempotent. A request example:

```sh
curl --fail-with-body "$PORTAL_URL/api/government/programs" \
  -H "Authorization: Bearer $PORTAL_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"agencyId":"<agency G-code>","nameEn":"Community innovation","nameFr":"Innovation communautaire"}'
```

## Administrator evidence

The clean-cutover baseline schema creates `audit_event` and `access_event`; portal code only inserts into these tables. Existing databases must be reset for this schema. `/admin/evidence` shows both lists to every authenticated administrator; `/api/admin/audit-events` and `/api/admin/access-events` enforce that session on the server and paginate results (25 by default, 100 maximum). No agency or role filter applies to administrators.

The request middleware records every `/api/*` response status, duration, method, route pattern, verified actor type and ID, agency ID for integration credentials, and a correlation ID. It writes an audit event for each successful non-read API request. Access records include denied and anonymous requests. The route pattern replaces unrecognized URL segments with `:id`; query strings, request bodies, authorization headers and credential values are never stored. Evidence is persisted after response completion, so it may appear shortly after the operation, and a process failure between response and persistence can lose that record. These records describe API activity; they do not yet contain GCS–SSC's database-row before/after capture or SQL query evidence. Retention and durable retry for failed evidence writes are not implemented yet.
