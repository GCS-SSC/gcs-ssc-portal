# Government administration and funding catalogue

Government staff use `/government/login` and `/government`. Organization navigation never exposes government management. Both entrypoints use Better Auth accounts, but government grants live in separate tables. An organization owner or administrator has no government authority. An account may participate in both domains only after separately receiving the necessary grants.

## Root and staff

Bootstrap exactly one root account using `bun run root:create` with `ROOT_NAME`, `ROOT_EMAIL`, and `ROOT_PASSWORD` in the process environment. The command uses the same `DATABASE_URL` or `PGLITE_DATA_DIR` as the application. For PGlite, stop the server first. Bun reads `.env`; production operators should inject the intended environment explicitly. Do not keep the root password in shared configuration, shell history, or version control.

The bootstrap command creates a fresh password account atomically and refuses an existing root or an existing email. It never elevates an ordinary registered account or resets a password. Public registration cannot grant government access. The root is protected from deactivation through the staff API. Root recovery is an operator-managed database/account recovery operation, not a public password-reset endpoint.

The root invites staff at `/government/staff`. Invitations are email-bound, hashed at rest, single-use, and expire after the same global `INVITATION_EXPIRY_DAYS` used by organization invitations. Root can optionally assign an existing agency in the invitation. A recipient registers or signs in and explicitly accepts. No email is sent, and acceptance does not claim to verify the email inbox.

Active staff may create their own agencies and receive access to those agencies atomically. Root controls assignment to existing agencies and can remove assignments. Removing an assignment blocks that agency; deactivating the staff account blocks all government access, including creation of new agencies, and invalidates its current login sessions. Reactivation restores the stored assignments. Government deactivation does not remove independent organization memberships.

## Structure and publication

The hierarchy is `agency → program → stream → funding_call`. Each entity has a server-generated UUIDv7 and a required English and French name, each at most 200 characters. Parent relationships are fixed at creation; the UI and API support renaming without moving children between hierarchies.

A call stores only its bilingual name, stream reference, start date, end date, publication state, ID and creation time. Agency and program derive from the stream, avoiding contradictory selections. Dates are calendar values `YYYY-MM-DD`; real dates and end ≥ start are required. The application period includes both boundary dates, using the current UTC calendar date for the Upcoming/Open/Closed label. There is no timestamp conversion or time-of-day deadline.

New calls are drafts. Staff explicitly publish or unpublish them. Published calls must be unpublished before editing. Publication controls visibility; dates label a published call as upcoming, open, or closed, rather than automatically hiding it. Ancestor names are live, so renaming a program updates its displayed name on published calls. Published calls can also expose a pinned survey revision for an interactive application-form preview. Response storage and application submission are not implemented in this step. See [surveys](surveys.md).

An organization's explicit `application:viewer` (or higher) grant exposes **Apply for funding** on its list entry and workspace. Neither `admin` nor ownership implies this grant. Organization administrators can add/remove it independently of `admin`; every member retains implicit `user`. The catalogue endpoint requires both membership and an application subject level, and returns published calls only. No government-management metadata or drafts appear in that endpoint.

## Machine API

Root creates/revokes agency-specific integration credentials at `/government/integrations`. Each has a name and expiry of 1–365 days (default 90). The random secret is displayed once; only its SHA-256 hash is stored. Pass it as `Authorization: Bearer gcs_…`. Invalid, expired and revoked credentials return 401 without falling back to cookie authentication. A credential may read/update its agency and manage that agency's programs, streams and calls. It cannot create agencies, provision users, manage tokens, or access organization APIs. Every request resolves its current scope; write transactions recheck and lock authority.

Cookie-authenticated writes require the canonical `Origin`. Machine requests without an Origin use explicit bearer authentication; a supplied foreign browser Origin is rejected. Request bodies are bounded at 16 KiB, with a 256 KiB envelope for survey, case and set writes. Responses are marked `no-store`. The API is ready for a future GCS–SSC extension; that separate extension is not implemented here.

All paths below start with `/api/government`. Names mean `{nameEn,nameFr}`. Schema errors return 400 with `data.code = INVALID_INPUT`; forbidden identities return 403; inaccessible agencies return 404.

| Method/path                     | Request                                       | Response/access                                            |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| GET /agencies                   | —                                             | `{agencies}`; own scopes or all for root                   |
| POST /agencies                  | names                                         | `{agency}`; human government staff/root                    |
| GET /agencies/:id               | —                                             | `{agency,programs,streams,calls}`; includes drafts, scoped |
| PATCH /agencies/:id             | names                                         | `{agency}`; scoped                                         |
| POST /programs                  | names, agencyId                               | `{program}`; scoped                                        |
| PATCH /programs/:id             | names                                         | `{success:true}`; scoped                                   |
| POST /streams                   | names, programId                              | `{stream}`; scoped                                         |
| PATCH /streams/:id              | names                                         | `{success:true}`; scoped                                   |
| POST /calls                     | names, streamId, startDate, endDate           | `{id}`; creates draft, scoped                              |
| PUT /calls/:id                  | names, unchanged streamId, startDate, endDate | `{id}`; draft only, scoped                                 |
| PATCH /calls/:id/publication    | `{published:boolean}`                         | `{success:true}`; scoped                                   |
| GET /staff                      | —                                             | Staff array, no credentials; root only                     |
| PATCH /staff/:userId/access     | `{agencyIds:string[]}`                        | Replaces agency assignments; root only                     |
| PATCH /staff/:userId/status     | `{active:boolean}`                            | Enables/disables staff; root only                          |
| GET /staff-invitations          | —                                             | Invitation metadata array; root only                       |
| POST /staff-invitations         | `{name,email,agencyId?:string-or-null}`       | `{id,expiresAt,url}`; root only                            |
| DELETE /staff-invitations/:id   | —                                             | Revokes pending invitation; root only                      |
| GET /invitations/:token         | —                                             | `{name,email,expiresAt}`; secret-link preview              |
| POST /invitations/:token/accept | —                                             | `{success:true}`; matching signed-in user                  |
| GET /integration-tokens         | —                                             | Credential metadata array; root only                       |
| POST /integration-tokens        | `{name,agencyId,expiresInDays?:number}`       | `{id,token,expiresAt}` once; root only                     |
| DELETE /integration-tokens/:id  | —                                             | `{success:true}`; root only                                |

`GET /api/organizations/:id/funding-calls` returns `{calls}` after checking organization membership and the application permission. Calls include bilingual ancestor names and IDs plus the fields above. `GET /api/session` returns `{user,government}` where `government` is null or `{role,agencyIds}`; UI decisions never replace server authorization.

Example extension request, with secrets injected into the process environment:

```sh
curl --fail-with-body "$PORTAL_URL/api/government/programs" \
  -H "Authorization: Bearer $PORTAL_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{"agencyId":"<agency UUID>","nameEn":"Community innovation","nameFr":"Innovation communautaire"}'
```

Use returned IDs to create streams, then calls; publish with a separate explicit PATCH. Persist those IDs in the extension for subsequent updates. Creation endpoints are not idempotent: reconcile against the agency structure before retrying an ambiguous network failure.

## Survey authoring and import

Agency staff and agency-scoped integration credentials can create and update surveys through the [survey API](surveys.md). Call attachments pin immutable revisions; editing a reusable survey never changes a published call. The portal supplies its own themed designer and preview over the public headless provider. The GCS–SSC sibling app and extension remain untouched.

Case configuration, ordered form sets, balance reconciliation and immutable submission exports are documented in [cases](cases.md).
