# Agreements, financial submissions and form sets

A government agency owns agreements under its streams. Each agreement belongs to one organization; stream, agency and organization are immutable. The server generates UUIDv7 portal IDs. Database composite foreign keys enforce stream/program/agency ancestry and agreement/set/organization ownership. Agency-scoped integration tokens use the API. Organization membership never grants government access.

The future extension supplies the organization UUID, agreement number, bilingual names, fiscal years and budget lines. Each line has bilingual names, category/subsection, currency, budgeted amount, optional balance/reconciled claimed amount/forecast amount and the source's UTC `balanceAsOf`. Any supplied balance, claimed amount or forecast amount requires a timestamp. Changed financial values require a newer timestamp once one has been recorded.

## Organization permissions

Each member has base `user` and optionally `admin`. Ownership retains admin; neither implies business permissions. Subjects are `application`, `claim`, `forecast`, and `form`, each with at most one explicit level:

| Level       | Actions                                           |
| ----------- | ------------------------------------------------- |
| viewer      | Read published sets and accessible responses      |
| contributor | Viewer actions plus create and edit shared drafts |
| manager     | Contributor actions plus submit or delete drafts  |

Permissions are stored as `subject:level`. The API accepts legacy `application` as `application:viewer`; migration 004 upgrades existing grants without elevating them. The funding catalogue accepts any application level. Application responses use the shared response engine with application permissions and a pinned call reference; see [applications](applications.md).

Survey-only sets, whether at agreement or organization level, require `form`. In a financial set, ancillary designed forms belong to the claim/forecast workflow and inherit its permissions. A set containing claim and forecast requires the applicable level for **both** subjects. Ancillary questions in financial sets do not additionally require standalone `form` access. Authorization is rechecked inside write transactions.

## Published sets and shared drafts

A set has up to ten ordered items. An item is a pinned survey revision, a standard claim for an agreement fiscal year, or a standard forecast for an agreement fiscal year. Financial items require an agreement. Organization sets contain designed forms only. The survey designer manages questions; the set editor chooses revisions and their order.

Publication freezes definitions and financial budget configuration under a UUIDv7 `publicationId`. Survey-only agreement sets retain `agreementReference` without exposing budget configuration. Responses copy the immutable snapshot, with one shared draft per set. Withdrawal blocks saving/submitting. Editing a withdrawn set then publishing creates a new publication; older drafts remain readable/deletable but cannot be submitted against it. Republishing without editing retains the same publication. Managers delete superseded drafts before starting replacements.

Agreement/set updates and draft changes use `expectedRevision` compare-and-swap. Government writes lock authority, then organization, then resource; organization writes lock organization then response. Balance pushes and submission checks share the organization lock. Concurrent edits and revoked permissions cannot silently overwrite another user's work.

Drafts can omit amounts and required survey answers, but supplied values must be valid. Final submission requires every configured claim line or forecast line/month, with explicit zero where appropriate. Claim descriptions are required. Survey validation and branch pruning use the shared provider. Submitted responses and export payloads are immutable. A new draft can follow a completed submission.

## Authoritative balances and warnings

Published definitions stay fixed; live balances match the current agreement by source, stable line identity, fiscal year and currency. Missing/changed lines warn as unavailable. Null balance means unknown, never zero. `claimedAmount` and `forecastAmount` come from the source, not portal aggregation.

A manager saves the draft and requests review. The server validates the response and returns current balances, warnings and `balanceRevision`. It warns if total claims or total forecasts in the set exceed a line's balance, if balance is unknown, or if the line is unavailable. Claims and forecasts are compared separately. A manager may acknowledge warnings and submit.

Submission rechecks authority, response revision, active publication and agreement revision. A changed balance/configuration returns `409 BALANCE_CHANGED`, requiring another review. The immutable export includes `balanceRevision`, `balancesAtSubmission` and `balanceWarnings`. Submitted screens initially show recorded balances and can explicitly refresh to current balances. Reconciliation never rewrites original amounts or reviewed balances. The portal does not deduct pending submissions from supplied balances.

## Foreign identifiers and GCS–SSC compatibility

`sourceSystem` is a namespace (default `gcs-ssc`); `foreignSystemId` is separate from portal UUIDs. GCS IDs are positive decimal **strings** through signed bigint max, never JavaScript numbers. Agreement and set foreign identities are unique within agency/source. Existing non-null agreement, fiscal-year, budget-line and set identities cannot be rebound by ordinary updates. Fiscal-year and budget-line local IDs are keys within the agreement.

Use stable GCS fiscal-year and budget-line **lineage/root IDs**, not physical rows created by amendments. The future extension resolves the current physical row. The portal cannot verify remote lineage; the extension must supply correct IDs.

| Portal field                        | GCS meaning                            |
| ----------------------------------- | -------------------------------------- |
| agreement config.foreignSystemId    | Funding agreement ID                   |
| config.externalStreamId             | Stream ID                              |
| config.externalApplicantRecipientId | Applicant/recipient ID                 |
| fiscal year foreignSystemId         | Stable agreement budget fiscal-year ID |
| budget line foreignSystemId         | Stable agreement budget-line-item ID   |
| set foreignSystemId                 | Source set identity when available     |

Agency/program/stream/call imports also accept sourceSystem/foreignSystemId; portal parent UUIDs establish the local hierarchy.

Money uses exact signed strings compatible with GCS `numeric(19,2)`: at most 17 integer digits and two decimals, canonicalized without rounding or floats. Negative corrections are supported. Currencies use the sibling's lowercase enumeration; `all` is Albanian lek. Fiscal month 0 is April and 11 is March.

Each export has an overall submissionId and a fresh itemSubmissionId for each ordered item. Claim export matches the GCS extension input: agreementId, streamId, fiscalYearId, isFinalForYear, periodStart, periodEnd, receivedDate, submissionUuid and lineItems. Lines contain budgetLineItemId, submittedCostCategory, submittedCostSubsection, submittedLineItem, description, canonical amount and currency. The extension converts the JSON ISO receivedDate to Date. submissionUuid is the stable item UUID for remote claim deduplication.

Forecast exports contain agreementId, header egcs_fc_fiscalyear, and line fields egcs_fc_fundingagreementbudgetlineitem, egcs_fc_month, egcs_fc_amount, egcs_fc_currency and egcs_fc_version ('0'). The extension creates the remote header and supplies its resulting ID as egcs_fc_agreementforecast. The sibling has no aggregate idempotent forecast SDK: the extension must reconcile header/line creation before retrying partial delivery. This portal does **not** deliver to GCS.

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

Balance pushes update only specified foreign line IDs. Missing/duplicate IDs fail, and asOf must be newer than each touched timestamp. Omitted optional claimed/forecast values mean unknown (null), so send all authoritative values to retain. Use full agreement updates to add/remove fiscal years and lines.

Creation is not upsert: persist portal IDs and reconcile foreign identities from scoped lists before retrying ambiguous creation. Submission polling is an offset-based full scan, not a change cursor; deduplicate by immutable submission/item IDs. There is no remote delivery acknowledgement.

Organization paths start /api/organizations/:organizationId:

| Method/path                        | Contract                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| GET /agreements                    | Agreement summaries after subject access                                     |
| GET /sets                          | Accessible published metadata                                                |
| GET /sets/:setId                   | Accessible published definition                                              |
| POST /sets/:setId/responses        | {locale:'en' or 'fr'} → existing/new shared draft                            |
| GET /responses                     | Accessible response summaries                                                |
| GET /responses/:responseId         | {response,balances,submittedBalances}; current plus optional frozen balances |
| PUT /responses/:responseId         | {expectedRevision,items}; save draft                                         |
| POST /responses/:responseId/check  | {expectedRevision} → {balanceRevision,balances,warnings}; manager            |
| POST /responses/:responseId/submit | {expectedRevision,balanceRevision,warningsAcknowledged}; manager             |
| DELETE /responses/:responseId      | {expectedRevision}; manager, draft only                                      |

Missing permission is 403; inaccessible scoped records are 404. Revision/balance conflicts, withdrawn/superseded publications and final-response mutations return 409. Invalid input returns 400. Reads and exports are no-store.

See [private attachments](attachments.md) for app-wide S3 configuration, per-form opt-in and download/cleanup contracts.
