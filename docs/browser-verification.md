# Historical browser journey verification

This 2026-09-19 record describes the former government staff screens. Those screens and the cited full-flow test were removed when configuration moved to the extension API. Current browser coverage is in `tests/e2e/government.spec.ts`, `extension-flow.spec.ts`, and `portal.spec.ts`.

This historical record predates removal of the Nuxt UI implementation. Current verification uses only GC Design System.

Performed on 2026-09-19 against the user's HTTP LAN address with Nuxt development mode, the Nuxt UI theme, isolated PGlite data and a private disposable MinIO bucket. Four independent browser sessions represented the organization owner, invited member, government root and invited staff member. Browser requests used their natural Origin header. Root bootstrap was the documented operator CLI step; the business workflow below used screen controls, not API fixture writes.

## Completed through the screens

1. Registered the owner, created an organization and generated a colleague invitation.
2. Opened the invitation in a separate browser, registered, accepted and confirmed the member initially lacked administrator and funding access.
3. Granted owner manager access and member contributor access through the people screen.
4. Signed in as the former root administrator and invited a government staff member.
5. Created an agency, program and stream; designed a bilingual required form with attachments; attached its saved revision to a call and published it.
6. The invited contributor started the application, entered answers, uploaded evidence and saved the shared draft. Submission controls were unavailable to that contributor.
7. The manager opened that same draft, downloaded the evidence, reviewed and submitted it. Staff opened the received response and downloaded the attachment. Both downloaded files had the same SHA-256 as the original.
8. Staff created a case with fiscal year, budget line, balances and stable foreign IDs, then published an ordered set: designed form → claim → forecast → designed form.
9. The contributor filled all four items and attached claim evidence. The manager reviewed an over-balance warning and submitted. Staff verified both designed-form answers, claim amount and forecast amount in the received response.
10. Downloaded the financial JSON through the staff screen and checked item order, exact claim amount, stable budget-line ID, fiscal-year mapping and attachment metadata.
11. Published a separate organization-level form. The contributor saved it, the manager submitted, and staff received the correct answers and organization context.

## Issues found and corrected

- LAN registration returned a misleading permissions error because the default `APP_URL` was `http://localhost:3000`. The ignored local environment now contains the user's exact LAN origin. Documentation explains the distinction between listening address and trusted origin; origin rejections have a specific bilingual message. Strict origin validation remains enabled.
- Browser-native `crypto.randomUUID()` is unavailable on HTTP LAN origins. Browser configuration IDs now use a 24-character alphanumeric Nano ID generator; server UUIDv7 IDs are unchanged.
- First navigation to a response triggered Vite dependency discovery and a full development reload. Required shared dependencies are now included in prebundling.
- The government submission list identified entries primarily by time and organization UUID. It now displays the frozen submission title and organization name, including context on the received-response page.

Historical automated verification additionally covered the former production builds, required-field accessibility, bilingual branching, ownership transfer, expired/wrong-account invitations, agency isolation, API credentials, balance changes, attachment conflict recovery, immutable submissions, PGlite migrations and disposable PostgreSQL. Survey and financial browser tests explicitly remove native `randomUUID` to protect the HTTP-LAN regression.

Test credentials, invitation tokens, local database files, downloads and screenshots stay in ignored test directories; they are not shipped as application data or secrets.

## Current regression coverage

`bun run test:e2e` builds GC Design System and verifies administrator agency/key provisioning, extension publication and form preview, and organization registration, invitation and access flows. The database integration suite covers cases, submissions, attachment authority, publication and financial rules that no longer have a government staff screen.
