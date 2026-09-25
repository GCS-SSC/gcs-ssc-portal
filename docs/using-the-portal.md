# Using the portal

## Organization administrators

Register an account, create an organization, then open its people page. The creator owns the organization and is an administrator. Admin is a base access type, not an automatic grant to funding or financial information. Give yourself and colleagues the appropriate application, claim, forecast or standalone-form permission.

A viewer can read. A contributor can start and edit shared drafts and their attachments. A manager can also submit and delete drafts. Financial sets containing both claims and forecasts require both permissions. Designed forms included in a financial set inherit that financial access; standalone forms use form access.

Create an invitation with the colleague’s email and share its link yourself. The portal does not send email. The recipient registers or signs in with that address and accepts the link. Links expire after the app-wide configured period. New members start with user access; grant business permissions separately. Only the current owner can transfer ownership, and the recipient must already be a member. Organization administrators can copy the organization UUID for the GCS–SSC extension configuring an agreement.

## System administrators and extension setup

The demo seed creates a system administrator. For a separate database, use `bun run admin:create` with `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Sign in at `/admin/login`, register each agency with names in both languages, then create and copy its integration key. Only the key hash is stored; the secret is shown once. Several administrators may exist, and their credentials are separate from organization accounts.

Give each agency its own key through a secure channel. The future GCS–SSC extension uses the agency API to provide programs, streams, funding calls, forms, agreements, budgets, and form sets. This companion app does not offer government staff sign-in or manual configuration screens. The extension is not implemented in this repository.

## Applications and other responses

Choose **Apply for funding** to preview published calls and start an application during its date window. Choose **Agreements** to see an agreement's published forms or forms published directly to the organization. Each organization shares one draft per call or set. Save deliberately, and reload if another contributor changed the revision; the portal rejects silent overwrites.

Upload optional attachments under each enabled form or financial item. Unsaved answer edits remain in place when a file is added or removed. A failed upload can advance the response revision; copy unsaved answers and reload before retrying. Files remain private and are available only to authorized viewers.

Managers save the draft, select **Review and submit**, review any balance warnings, then confirm. Claims and forecasts may exceed the latest supplied balance: warnings must be acknowledged, but managers may submit. Source balances may not include pending submissions. A changed balance revision requires a fresh review.

Submitted responses are final. Read the recorded balances and attachments, or explicitly refresh the financial display to current balances. Submission history remains accessible when a call closes or a form is withdrawn. The extension can retrieve immutable JSON exports and attachments with the agency key.

## Operators

Follow the README for building the application, production HTTPS, database configuration and administrator provisioning. Follow [private attachments](../architecture/attachments.md) for private S3 access, limits, cleanup and backup. The locale toggle changes only the interface language; it does not translate persisted bilingual definitions automatically.
