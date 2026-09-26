# Agreements, financial submissions and form sets

A government agency owns agreements under its streams. Each agreement belongs to one organization; stream, agency and organization are immutable. The database assigns integer entity keys; APIs and routes use prefixed Sqids. Database composite foreign keys enforce stream/program/agency ancestry and agreement/set/organization ownership. Agency-scoped integration tokens use the API. Organization membership never grants government access.

The future extension supplies the N-prefixed organization ID, agreement number, bilingual names, fiscal years and budget lines. Each line has bilingual names, category/subsection, currency, budgeted amount, optional balance/reconciled claimed amount/forecast amount and the source's UTC `balanceAsOf`. Any supplied balance, claimed amount or forecast amount requires a timestamp. Changed financial values require a newer timestamp once one has been recorded.

The extension can also supply `active` (boolean) and `status` (`{en,fr,colour}` or null) on agreement create/update. `colour` is a six-digit `#RRGGBB` value; both localized labels are required when a status is supplied. New and migrated agreements default to active with no published status. Omitted fields on a full agreement update retain their current values, while explicit `status: null` clears the published status. Both fields appear in government responses and the organization agreement list. The portal displays the active flag and the published status text/colour without interpreting the status label or changing agreement access.

The organization agreement list API joins the owning agency and returns `agencyNameEn` and `agencyNameFr` with each agreement summary. The list shows the agency name in the selected interface language.

Opening an organization agreement navigates to `/organizations/:organizationId/agreements/:agreementId` with N-prefixed organization and A-prefixed agreement IDs. The agreement page uses the organization-scoped agreement list, published set, and response endpoints. Its side navigation presents Overview, Claims, Forecasts, and Other submissions. Each submission category has a Start new submission action and three separate searchable tables: In Progress (draft), Awaiting Documentation, and Submitted. Claims show their short ID, period start, period end, and final-claim flag; forecasts show their short ID, fiscal year, and iteration. Other submissions show both form name and short ID in the first cell so both remain available on mobile. The secondary GCS status appears under the table heading “Status” without repeating its section's primary status. The single published claim or forecast template starts directly. Survey-only sets appear under Other. The page only displays an agreement found in the authorized organization's list. Response lists are scoped by the agreement reference captured in each snapshot, including drafts and survey-only agreement sets.

Portal entities use database-assigned integer keys. Sqids 0.3.0 encodes these numbers with a fixed minimum five-character body using uppercase letters and digits 2–9, excluding I, L, O, 0, and 1. Public IDs use `N-` for organizations, `A-` for agreements, `S-` for sets, and `C-`, `F-`, or `K-` for claim, forecast, or other responses. Codes are visible references and search terms, not access tokens. URLs, API paths and payloads, and submission exports use public codes. Integer keys remain internal and do not bypass server authorization.

## Organization permissions

Each member has base `user` and optionally `admin`. Ownership retains admin; neither implies business permissions. Subjects are `application`, `claim`, `forecast`, and `form`, each with at most one explicit level:

| Level       | Actions                                           |
| ----------- | ------------------------------------------------- |
| viewer      | Read published sets and accessible responses      |
| contributor | Viewer actions plus create and edit shared drafts |
| manager     | Contributor actions plus submit or delete drafts  |

Permissions are stored as `subject:level`. The API accepts legacy `application` as `application:viewer`; migration 004 upgrades existing grants without elevating them. The funding catalogue accepts any application level. Application responses use the shared response engine with application permissions and a pinned call reference; see [applications](applications.md).

Survey-only sets, whether at agreement or organization level, require `form`. In a financial set, ancillary designed forms belong to its claim or forecast workflow and inherit its permissions. A set cannot mix claim and forecast items. Ancillary questions in financial sets do not additionally require standalone `form` access. Authorization is rechecked inside write transactions.

## Published sets and shared drafts

A set has up to ten ordered items. An item is a pinned survey revision, a standard claim for an agreement fiscal year, or a standard forecast for an agreement fiscal year. Financial items require an agreement. Organization sets contain designed forms only. The survey designer manages questions; the set editor chooses revisions and their order.

Publication freezes definitions and financial budget configuration under a stable Sqids-based `publicationId`. Survey-only agreement sets retain `agreementReference` without exposing budget configuration. Responses copy the immutable snapshot, with one shared draft per set. Withdrawal blocks saving/submitting. Editing a withdrawn set then publishing creates a new publication; older drafts remain readable/deletable but cannot be submitted against it. Republishing without editing retains the same publication. Managers delete superseded drafts before starting replacements.

Agreement/set updates and draft changes use `expectedRevision` compare-and-swap. Government writes lock authority, then organization, then resource; organization writes lock organization then response. Balance pushes and submission checks share the organization lock. Concurrent edits and revoked permissions cannot silently overwrite another user's work.

Drafts can omit amounts and required survey answers, but supplied values must be valid. Final submission requires every configured claim line or forecast line/month, with explicit zero where appropriate. Claim descriptions are required. Survey validation and branch pruning use the shared provider. Submitted responses and export payloads are immutable. A new draft can follow a completed submission.

Forecast iteration is a stable one-based number per agreement and fiscal year. Draft creation assigns the next number while holding the organization lock, and the response stores it separately from the immutable GCS export. Deleting an earlier draft does not renumber later forecasts.

Response status is `draft`, `submitted`, or `awaiting_documentation`. The government status update endpoint accepts only the latter two states for an existing submission and a nullable bilingual GCS status object with a validated hex colour. It uses response revision compare-and-swap and current agency authority. GCS status is secondary display information and does not grant access. The original export, answers, and submission timestamp remain immutable. Contributors may append a message, files, or both while a response is awaiting documentation; each send records a separate follow-up. Already sent files cannot be removed, and staged files are invisible to government until sent. The government response read includes follow-up messages and sent file metadata. Closing the documentation request detaches unsent staged files for cleanup.

## Authoritative balances and warnings

Claim drafts start with one editable row and may add, remove, or repeat rows up to the schema limit of 200. Each row selects a published budget line through its cost category, subsection, and line name; the budget line ID is the stored reference. The server verifies that ID against the published agreement fiscal year. A claim needs at least one row to submit. Repeated rows remain separate in the immutable export, while balance checks sum their amounts by budget line. Forecasts keep their fixed twelve month rows per budget line.

Agreement config accepts an optional bilingual `claimInstruction` from the government agreement API. A published claim set pins it in its agreement snapshot for the applicant form. Existing agreements without an instruction remain valid. Demo seed migration 010 adds sample instructions to demo agreements, published claim sets, and active claim drafts without modifying submitted records.

Agreement config also accepts an optional bilingual `forecastInstruction` through the same API. Published forecast sets pin it in their agreement snapshot, so later agreement edits do not change a draft or submitted forecast's instructions. Existing configs without it remain valid. Demo seed migration 011 adds illustrative instructions to demo agreements, published forecast sets, and active forecast drafts without modifying submitted records. This is prospective extension-supplied form guidance; the current GCS forecast table has no instruction column.

Published definitions stay fixed; live balances match the current agreement by source, stable line identity, fiscal year and currency. Missing/changed lines warn as unavailable. Null balance means unknown, never zero. `claimedAmount` and `forecastAmount` come from the source, not portal aggregation.

A manager saves the draft and requests review. The server validates the response and returns current balances, warnings and `balanceRevision`. It warns if total claims or total forecasts in the set exceed a line's balance, if balance is unknown, or if the line is unavailable. Claims and forecasts are compared separately. A manager may acknowledge warnings and submit.

Submission rechecks authority, response revision, active publication and agreement revision. A changed balance/configuration returns `409 BALANCE_CHANGED`, requiring another review. The immutable export includes `balanceRevision`, `balancesAtSubmission` and `balanceWarnings` for audit; these are not applicant form fields. Draft screens load the current government-supplied balances when opened and after each save; review and submission check them against the database. Submitted screens do not show balance guidance. Reconciliation never rewrites original amounts or reviewed balances. The portal does not deduct pending submissions from supplied balances.

## Foreign identifiers and GCS–SSC compatibility

`sourceSystem` is a namespace (default `gcs-ssc`); `foreignSystemId` is separate from portal IDs. GCS IDs are positive decimal **strings** through signed bigint max, never JavaScript numbers. Agreement and set foreign identities are unique within agency/source. Existing non-null agreement, fiscal-year, budget-line and set identities cannot be rebound by ordinary updates. Fiscal-year and budget-line local IDs are keys within the agreement.

Use stable GCS fiscal-year and budget-line **lineage/root IDs**, not physical rows created by amendments. The future extension resolves the current physical row. The portal cannot verify remote lineage; the extension must supply correct IDs.

| Portal field                        | GCS meaning                            |
| ----------------------------------- | -------------------------------------- |
| agreement config.foreignSystemId    | Funding agreement ID                   |
| config.externalStreamId             | Stream ID                              |
| config.externalApplicantRecipientId | Applicant/recipient ID                 |
| fiscal year foreignSystemId         | Stable agreement budget fiscal-year ID |
| budget line foreignSystemId         | Stable agreement budget-line-item ID   |
| set foreignSystemId                 | Source set identity when available     |

Agency/program/stream/call imports also accept sourceSystem/foreignSystemId; portal parent integer keys establish the local hierarchy.

Money uses exact signed strings compatible with GCS `numeric(19,2)`: at most 17 integer digits and two decimals, canonicalized without rounding or floats. Negative corrections are supported. Currencies use the sibling's lowercase enumeration; `all` is Albanian lek. Fiscal month 0 is April and 11 is March.

Each export has an overall submissionId and a stable itemSubmissionId for each ordered item. Claim export includes agreementId, streamId, fiscalYearId, isFinalForYear, periodStart, periodEnd, receivedDate, submissionCode and lineItems. Lines contain budgetLineItemId, submittedCostCategory, submittedCostSubsection, submittedLineItem, description, canonical amount and currency. The extension converts the JSON ISO receivedDate to Date. The future GCS extension must accept `submissionCode` as the stable item reference before consuming these exports.

Forecast exports contain agreementId, header egcs_fc_fiscalyear, and line fields egcs_fc_fundingagreementbudgetlineitem, egcs_fc_month, egcs_fc_amount, egcs_fc_currency and egcs_fc_version ('0'). Month 0 is April and month 11 is March. Every published budget line/month is exported, including explicit zeroes; the sibling UI virtualizes absent zero cells, so the extension must agree on handling these before import. The forecast item also carries `portalIteration`, the stable one-based local submission sequence. It is separate from the sibling's per-line `egcs_fc_version`; no mapping between them is established. The sibling allows only one active forecast header per agreement and fiscal year, while the portal allows successive submissions. The extension must agree with GCS on how later submissions affect that header and its versions before importing them. The extension creates or reconciles the remote header and supplies its resulting ID as egcs_fc_agreementforecast. The sibling has no aggregate idempotent forecast SDK: the extension must reconcile header/line creation before retrying partial delivery. This portal does **not** deliver to GCS. Forecast mapping completeness requires agreement, fiscal-year and budget-line foreign IDs; unlike a claim, a forecast does not require stream ID.

Manual agreements can have null mappings. Financial items report mappingComplete=false; the extension must resolve missing mappings. Exports retain original local/foreign line identities, survey definitions/answers and agreement reference. The sibling remains unmodified.

## API

Government endpoints require agency-scoped bearer credentials. Foreign browser Origins are rejected. Agreement/set bodies are bounded at 256 KiB; organization response bodies at 3 MiB. Strict schemas in shared/schemas/agreements.ts are authoritative.

| Method/path after /api/government            | Contract                                                                                                              |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GET /agencies/:agencyId/agreements           | {agreements}                                                                                                          |
| POST /agreements                             | AgreementInput → {agreement}                                                                                          |
| GET /agreements/:id                          | {agreement}                                                                                                           |
| PUT /agreements/:id                          | {expectedRevision,value:AgreementInput} → {agreement}                                                                 |
| PUT /agreements/:id/balances                 | {expectedRevision,asOf,lines:[{foreignSystemId,budgetedAmount,balance,claimedAmount?,forecastAmount?}]} → {agreement} |
| GET /agencies/:agencyId/sets                 | {sets}                                                                                                                |
| POST /sets                                   | SetInput → {set}                                                                                                      |
| GET /sets/:id                                | {set}                                                                                                                 |
| PUT /sets/:id                                | {expectedRevision,value:SetInput} → {set}; withdrawn only                                                             |
| POST /sets/:id/publish                       | {expectedRevision} → {set}                                                                                            |
| POST /sets/:id/withdraw                      | {expectedRevision} → {set}                                                                                            |
| GET /agencies/:agencyId/submissions?offset=0 | {submissions,nextOffset}; ascending submittedAt/id, 50 per page                                                       |
| GET /submissions/:submissionId               | {submission}; immutable export                                                                                        |
| PUT /submissions/:submissionId/status        | {expectedRevision,status,gcsStatus} → {response}; agency-scoped review state                                          |

Balance pushes update only specified foreign line IDs. Missing/duplicate IDs fail, and asOf must be newer than each touched timestamp. Omitted optional claimed/forecast values mean unknown (null), so send all authoritative values to retain. Use full agreement updates to add/remove fiscal years and lines.

Creation is not upsert: persist portal IDs and reconcile foreign identities from scoped lists before retrying ambiguous creation. Submission polling is an offset-based full scan, not a change cursor; deduplicate by immutable submission/item IDs. There is no remote delivery acknowledgement.

Organization paths start /api/organizations/:organizationId:

| Method/path                         | Contract                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| GET /agreements                     | Agreement summaries after subject access                                                   |
| GET /sets                           | Accessible published metadata                                                              |
| GET /sets/:setId                    | Accessible published definition                                                            |
| POST /sets/:setId/responses         | {locale:'en' or 'fr'} → existing/new shared draft                                          |
| GET /responses                      | Accessible response summaries                                                              |
| GET /responses/:responseId          | {response,balances,submittedBalances}; current plus optional frozen balances               |
| PUT /responses/:responseId          | {expectedRevision,items}; save draft                                                       |
| POST /responses/:responseId/check   | {expectedRevision} → {balanceRevision,balances,warnings}; manager                          |
| POST /responses/:responseId/submit  | {expectedRevision,balanceRevision,warningsAcknowledged}; manager                           |
| DELETE /responses/:responseId       | {expectedRevision}; manager, draft only                                                    |
| POST /responses/:responseId/details | {expectedRevision,body,attachmentIds} → response; contributor, awaiting documentation only |

Missing permission is 403; inaccessible scoped records are 404. Revision/balance conflicts, withdrawn/superseded publications and final-response mutations return 409. Invalid input returns 400. Reads and exports are no-store.

See [private attachments](attachments.md) for app-wide S3 configuration, per-form opt-in and download/cleanup contracts.
