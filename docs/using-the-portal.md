# Using the portal

## Organization administrators

Register an account, create an organization, then open its people page. The creator owns the organization and is an administrator. Admin is a base access type, not an automatic grant to funding or financial information. Give yourself and colleagues the appropriate application, claim, forecast or standalone-form permission.

A viewer can read. A contributor can start and edit shared drafts and their attachments. A manager can also submit and delete drafts. Financial sets containing both claims and forecasts require both permissions. Designed forms included in a financial set inherit that financial access; standalone forms use form access.

Create an invitation with the colleague’s email and share its link yourself. The portal does not send email. The recipient registers or signs in with that address and accepts the link. Links expire after the app-wide configured period. New members start with user access; grant business permissions separately. Only the current owner can transfer ownership, and the recipient must already be a member. Organization administrators can copy the organization UUID for the government worker setting up a case.

## Government administrators and staff

The operator creates the initial root account with `bun run root:create` using the same database settings. Sign in through **Government administration**. Root invites government staff and assigns agency access independently of organization membership. Staff can create an agency, then programs and streams. Root manages access to existing agencies and can deactivate staff.

Open **Application forms** from an agency to design a reusable form. Enter both languages for titles, questions, choices and any descriptions. Add pages, sections and subsections, assign questions, and use conditional visibility or page-exit rules to control forward flow. Preview both languages and paths, then save a revision. Enable attachments if needed; bucket configuration belongs to the application operator.

Create a call under its stream, choose opening/closing dates and attach a saved form revision. Publish when ready. Editing the reusable form alone does not change a call. Unpublish the call to change its definition or form revision; affected old drafts remain readable but must be deleted/restarted before submission against the new revision.

Use **Cases and submissions** to configure a case for an organization. Enter the organization UUID, stream, agreement number, fiscal years and budget lines. Source-system IDs refer to stable lineage IDs supplied by GCS–SSC. Enter current budgets and balances with their source timestamp. Create a set at the case or organization level and add forms in the required order. Claims and forecasts use the case’s lines and fiscal years, with no financial form designer. Enable attachments separately for each financial item. Publish the set when ready.

The same setup and reconciliation operations are exposed by the agency-scoped integration API. Root creates integration credentials; keep secrets on the integrating server. The future GCS–SSC extension will use these contracts but is not implemented in this repository.

## Applications and other responses

Choose **Apply for funding** to preview published calls and start an application during its date window. Choose **Cases and forms** for published case or organization sets. Each organization shares one draft per call/set. Save deliberately, and reload if another contributor changed the revision; the portal rejects silent overwrites.

Upload optional attachments under each enabled form or financial item. Unsaved answer edits remain in place when a file is added or removed. A failed upload can advance the response revision; copy unsaved answers and reload before retrying. Files remain private and are available only to authorized viewers.

Managers save the draft, select **Review and submit**, review any balance warnings, then confirm. Claims and forecasts may exceed the latest supplied balance: warnings must be acknowledged, but managers may submit. Source balances may not include pending submissions. A changed balance revision requires a fresh review.

Submitted responses are final. Read the recorded balances and attachments, or explicitly refresh the financial display to current balances. Submission history remains accessible when a call closes or a form is withdrawn. Government staff open the submission title in the agency’s submissions list to review answers and download attachments, or download the immutable JSON export for integration.

## Operators

Follow the README for building one theme, production HTTPS, database configuration and root bootstrap. Follow [private attachments](../architecture/attachments.md) for private S3 access, limits, cleanup and backup. A theme change requires a rebuild. The locale toggle changes only the interface language; it does not switch themes or translate persisted bilingual definitions automatically.
