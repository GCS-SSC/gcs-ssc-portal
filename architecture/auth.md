# Authentication and organization access

Better Auth owns email/password accounts and opaque cookie sessions. The server configures a canonical `APP_URL`, trusted origin checks, secure production cookies, password lengths of 12–128 characters, seven-day sessions, and authentication rate limits. Production requires an explicit HTTPS `APP_URL` and at least 32 characters in `BETTER_AUTH_SECRET` (`AUTH_SECRET` is also accepted). Development defaults to localhost:3000. Change `APP_URL` when running on another port.

The browser uses Better Auth's native JSON endpoints: `POST /api/auth/sign-up/email` with `{name,email,password}`, `POST /api/auth/sign-in/email` with `{email,password}`, and `POST /api/auth/sign-out`. Cookie credentials stay on the same origin. Passwords are hashed by Better Auth; this project never stores plaintext passwords. Password recovery and verification emails are intentionally not configured because there is no email service.

`GET /api/session` returns `{user:{id,name,email}|null}`. All other portal operations require a session except invitation previews. Portal mutation requests must carry an `Origin` equal to `APP_URL`; cross-site requests are rejected. Both portal and authentication bodies are limited to 16 KiB by counting actual streamed bytes, including chunked uploads. Responses are not cached and invitation API responses set `Referrer-Policy: no-referrer`.

## Organization permissions

Membership implies the permanent `user` permission; explicit additive `admin` grants are stored separately. There are no reassignable roles. Every member can view their organization and its members. Only organization admins can edit the organization, create/revoke/list invitations, or grant/remove admin. Inaccessible organizations return 404. Creator receives membership, admin, and ownership in one transaction.

Only the current owner can transfer ownership, and only to an existing member. The recipient receives admin, the former owner retains admin, and the owner's admin cannot be removed. All organization writes lock the organization row first and recheck mutable authorization inside the transaction. Cross-organization references do not grant access.

Invitations are bearer secrets generated from 32 random bytes. Only SHA-256 hashes are persisted. Admins copy and share links themselves; no message is sent. Each address has its previous pending invitations revoked when a replacement is created. `INVITATION_EXPIRY_DAYS` applies to new invitations globally (default 7; integer 1–365). Accepting requires a signed-in account with a matching email and the secret link. Existing accounts are never attached merely because an admin knows their address. Acceptance, membership creation, and consumption happen atomically; new membership carries only `user`. A consumed, expired, malformed, or revoked link returns the same unavailable error. A manually shared invitation never sets global email verification: possession does not prove mailbox control. Invitees with existing accounts sign in; invitations do not bypass passwords or reset accounts.

## Portal API contract

Shared response entities are in `shared/types/api.ts`; request schemas are in `shared/schemas/portal.ts`. Dates are ISO strings. Errors carry stable codes in `data.code` (and generally the same `message`); schema failures return `INVALID_INPUT` with field paths.

| Method and path                                         | Request                       | Response                                  |
| ------------------------------------------------------- | ----------------------------- | ----------------------------------------- |
| GET /api/organizations                                  | —                             | `{organizations: Organization[]}`         |
| POST /api/organizations                                 | `{name,description?}`         | `{organization: Organization}`            |
| GET /api/organizations/:id                              | —                             | `{organization: Organization}`            |
| PATCH /api/organizations/:id                            | `{name,description?}`         | `{organization: Organization}`            |
| GET /api/organizations/:id/members                      | —                             | `{members: Member[]}`                     |
| PATCH /api/organizations/:id/members/:userId            | `{permissions:['user', ...]}` | `{success:true}`                          |
| POST /api/organizations/:id/transfer                    | `{userId}`                    | `{organization: Organization}`            |
| GET /api/organizations/:id/invitations                  | —                             | `{invitations: Invitation[]}`             |
| POST /api/organizations/:id/invitations                 | `{email,name?}`               | `{invitation: Invitation,url}`            |
| DELETE /api/organizations/:id/invitations/:invitationId | —                             | `{success:true}`                          |
| GET /api/invitations/:token                             | —                             | `{organizationName,email,name,expiresAt}` |
| POST /api/invitations/:token/accept                     | —                             | `{organization: Organization}`            |

Future permission types require explicit server policies and a migration of the permission constraint. There are no account/organization deletion operations yet. Account registration is open; account verification is not a prerequisite for creating a new organization. Invitations establish access to an organization without exposing its membership to the public.

## Client addresses and proxy trust

Better Auth rate limiting reads only the internal `x-portal-client-ip` header. The Node HTTP boundary always deletes the caller's value and replaces it with `socket.remoteAddress`. Incoming `X-Forwarded-For`, `X-Real-IP`, and similar headers are never trusted. Direct clients therefore receive per-peer limits; clients behind a reverse proxy share the proxy's bucket by default. A production proxy deployment should enforce appropriate edge rate limits; a future trusted-proxy configuration must explicitly allowlist the proxy and sanitize forwarding headers before enabling end-user address attribution. Authentication responses are marked `Cache-Control: no-store`.

## Government and application permissions

Government grants are independent of organization membership and permissions. Root explicitly bootstraps via CLI and invites staff. `application` is an additive organization permission required to read the published funding catalogue; `admin` and owner status do not imply it. See [government administration](government.md) for provisioning, agency scoping and bearer credential rules.
