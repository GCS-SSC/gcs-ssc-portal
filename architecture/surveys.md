# Headless survey provider and portal integration

The shared provider is `@gcs-ssc/survey`, maintained separately in the public `GCS-SSC/survey` repository. The portal installs its captured compiled provider through `vendor/survey`; provider source remains in its owning repository. The GCS–SSC application has not been modified. It can adopt the same package later with its own UI and server-side extension.

## Package boundary

The core entrypoint exports the versioned JSON schemas (v1–v5), inferred TypeScript types, answer schema and answer validator. The `/vue` entrypoint exports a renderless `HeadlessSurvey` component and `useSurveyDesigner`. The optional `/client` entrypoint exports the server-side portal import helper. Neither core nor client loads Vue; Vue is an optional peer required by `/vue`.

The provider has no Nuxt, theme, CSS, database or authentication dependency. Renderless slots expose localized questions, values, errors, required/disabled state, options and setter actions. Hosts choose every element and control, and own accessible DOM IDs/labels, focus behavior, validation messages, layout and persistence. The portal implements these with its existing `PortalInput`, `PortalSelect` and `PortalButton` adapters, so the application uses the shared model and behavior.

Version 1 supports text, email, number, calendar date and single choice. It requires English/French titles and question labels. Single-choice options also require both languages and stable values. There are 1–50 saved questions, 2–30 options per choice question, 1–200 characters per label, up to 500 per help text, and up to 5000 per text response. Question IDs and option values must be unique in their respective scopes. Content is plain text, not HTML or executable expressions. Unknown schema versions, properties and controls are rejected.

Answers are string values keyed by stable question IDs. Numbers intentionally retain entered text so clearing a field never becomes zero. Required validation, email, finite decimal notation, real YYYY-MM-DD dates, allowed choices and maximum lengths use the same validator in every host. The package exposes draft and final validation modes. The portal persists shared application and agreement-form drafts, and managers submit immutable responses through the [application](applications.md) and [agreement](agreements.md) APIs. Preview screens explicitly state that responses are not saved or submitted.

## Structured forms and flow (version 2)

The provider preserves archived and call-pinned definitions under their original version. The GCS connector upgrades a separate editing copy for current authoring; imports accept every supported version. No database reset or schema migration is needed because immutable definitions already live in JSONB.

Version 2 adds pages, sections and subsections with bilingual headings and optional descriptions. Every supplied description/help text requires both nonblank English and French; otherwise omit the field. Each question is assigned exactly once. Rendering follows page questions, then section questions, then subsection questions in order. The provider validates unique IDs, placements, limits and references.

Questions and groups can have conditional visibility. Page exits support ordered first-match branch rules, explicit forward page destinations or end, and a default route. The condition editor offers all/any matching, exact equality/inequality, text containment, numeric greater/less comparisons and answered/unanswered predicates. Conditions can only refer to earlier questions (or current-page questions at page exit), and hidden/skipped sources never match. Forward-only targets prevent cycles; Back follows the actual route.

The shared evaluator controls routing, pruning and validation. Changing an earlier answer removes values that become hidden/off-route, while preserving still-reachable answers. Hidden required questions do not block progress. Content-only pages remain visible. The renderless provider exposes page structure, fields, Next/Back, completion state and errors; the portal renders them through Theme adapters and moves focus to the page or error summary. Completing the preview still does not save or submit an application.

Designer deletions refuse questions referenced by conditions. Empty containers can be removed; questions must first be moved out. Page/section reorder and option/type changes may require repairing conditions before save. Both the UI and server validate the full shared schema.

## Portal workflow

Version 3 repeating sets use a `repeat` source question with stable row IDs and no item-name input. The portal shows add and remove controls, then renders each child question within its numbered instance; sets can nest. Required repeat sources need at least one instance, and the shared validator checks nested child answers. Existing `list` questions retain their named-item controls and remain readable in pinned revisions. The new form designer offers repeating sets directly and no longer offers standalone lists. Both portal and extension ship the same compiled provider version.

The future extension creates and updates bilingual forms through the agency-scoped API. Persisted forms require at least one valid question, and optimistic revision checks reject overwriting a newer form.

Calls can attach up to ten ordered saved form revisions through the call API. Every survey must belong to the call's agency. Published calls must be unpublished before attaching, replacing or removing forms. Once any application has been submitted, the call's attachments cannot change even after withdrawal; both the single-survey and ordered-forms routes return 409 `CALL_HAS_SUBMISSIONS`. Updating a survey creates a new immutable revision; it never changes a call's current attachment. Existing calls without forms remain valid.

Organization members with application viewer access can open a published call’s form preview and read saved applications. Contributors start and edit shared drafts; managers submit or delete them. The server returns only its pinned revision, and rechecks membership, permission and publication. Draft calls and other survey revisions are not exposed. Organization users never gain government survey editing authority.

## Persistence and API

Migration `003_surveys` adds `survey` (agency, current revision and update timestamp), immutable `survey_revision` (JSON definition and creation time), and nullable `surveyId`/`surveyRevision` on `funding_call`. Migration `016_call_forms` adds the ordered relation and backfills existing attachments. The legacy pair reflects the first form for existing callers. Foreign keys enforce valid revisions. Updates lock the integration credential then the survey row, compare `expectedRevision`, insert a revision and advance the head in one transaction. Attachment locks the actor then call; parent agency links are immutable. Survey IDs are database-assigned integers internally and V-prefixed Sqids in the API.

All government routes require an active agency-scoped integration credential. Survey mutation requests have a bounded 256 KiB envelope; the shared definition schema permits at most 240 KiB UTF-8. Other endpoints retain the 16 KiB request limit.

| Method/path                                             | Body                            | Result                                                                                                        |
| ------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| GET /api/government/agencies/:id/surveys                | —                               | `{surveys:[{id,agencyId,revision,title,updatedAt}]}`                                                          |
| POST /api/government/surveys                            | `{agencyId,definition}`         | `{survey:{id,agencyId,revision,definition,updatedAt}}`                                                        |
| GET /api/government/surveys/:id                         | —                               | Latest `{survey}`; scoped                                                                                     |
| PUT /api/government/surveys/:id                         | `{expectedRevision,definition}` | New `{survey}`; 409 on revision conflict                                                                      |
| PUT /api/government/calls/:id/survey                    | `{surveyId,revision}`           | `{success:true}`; draft call, same agency                                                                     |
| PUT /api/government/calls/:id/survey                    | `{surveyId:null,revision:null}` | Detach; draft call only                                                                                       |
| PUT /api/government/calls/:id/forms                     | `{forms:[{surveyId,revision}]}` | Replace ordered forms; draft call, same agency, maximum ten                                                   |
| GET /api/organizations/:id/funding-calls/:callId/survey | —                               | `{survey:{callId,nameEn,nameFr,surveyId,revision,definition}}`; published, member with application permission |

The optional package import helper validates definitions and response envelopes, refuses redirects, and never retries writes automatically. It creates surveys using POST or updates known survey IDs using PUT plus an expected revision. An extension must persist returned IDs/revisions. Its durable delivery transport can use the [agency-scoped idempotency contract](government.md) to replay ambiguous creates or updates; unkeyed writes still require reconciliation. Creating a survey and attaching it to a call are explicit separate operations; import never publishes a call automatically. Credentials belong in the extension's server environment, never browser bundles.

## Verification

The package owns model, headless Vue, designer and transport tests. The portal owns database lifecycle/access tests and GC Design System browser journeys covering direct design, required fields, all initial controls, bilingual preview, reload/edit, imported surveys, body limits, call attachment, revision conflicts and applicant visibility. PostgreSQL tests use an isolated disposable database, alongside the PGlite lane.

See [private attachments](attachments.md) for app-wide S3 configuration, per-form opt-in and download/cleanup contracts.

Budget and Activities questions use schema version 4 of the public headless provider. Their strict versioned row payloads remain answer-map strings; portable configs snapshot catalogs and optional GCS references. They collect applicant information and do not create GCS Agreement records. Custom catalogs and unresolved responsible parties require later reconciliation. Single-language activity responses require agency translations before GCS creation. Publication checks reject missing Budget years/cost items or required Activity catalogs; saved drafts and old revisions remain readable. The same provider validates and normalizes draft/submitted money; submitted views render structured labels and amounts, including original activity text when the interface language changes.

## Designer field rules (version 5)

Imported version 5 forms add typed field rules for compatible answer comparisons,
constant bounds, relative calendar dates, text lengths, decimal precision, selection/row
counts, conditional required responses, URL/postal-code/phone/identifier formats,
acknowledgement choices, group completeness, row uniqueness and table-total reconciliation.
Table columns may also carry compatible scalar rules; row and column context appears
in the table error. GCDS table inputs expose that group message through `aria-description`,
which the installed Input observes and forwards to the actual shadow control; an external
`aria-describedby` reference alone does not establish that association. The shared provider validates the authored definition, selects
active repeated instances, evaluates the rules, and supplies localized English/French
inline errors and dynamic required descriptors. `SurveyFields` uses those messages
through the existing GCDS control error props; both local Preview and application or
agreement entry share that renderer. Computed readback includes version 5 forms.

Draft saves allow unanswered required fields, including conditionally required fields.
Drafts defer minimum text lengths, selection/row counts, unfinished groups and exact
total reconciliation so unfinished entry can be saved. Upper bounds, uniqueness,
formats and populated comparisons are checked on both draft and final validation; comparisons wait
until both active values are populated and valid. Zero is a value, never a missing answer. Version 5 numeric rules and conditional-required
predicates compare the original decimal strings exactly, including values above the
JavaScript safe integer range; existing visibility and navigation conditions retain
their versioned evaluation contract.
Hidden and skipped fields retain provider pruning and do not demand entry. Rules compare
compatible fields in the same repeated entry or an accessible ancestor scope; they do
not aggregate across unrelated entries or separate forms.

The existing response persistence boundary validates against the captured published
survey definition in Save, Check and Submit, for applications and agreement forms.
Updating a survey creates a separate immutable revision: existing pinned calls, drafts
and submissions retain their original rules, and versions 1–4 keep their prior contract.
The Portal provides applicant rendering and agency integration APIs; the GCS connector
owns the form designer. No new Portal authoring screen or database migration is needed.

`tests/integration/applications.test.ts` covers incomplete drafts, populated invalid
values, conditional requirements (including exact large-number thresholds), recovery,
final submission and pinned revisions.
`tests/integration/agreements.test.ts` covers rule enforcement through an agreement form.
`tests/integration/field-rules.test.ts` exercises relative dates, format presets,
acknowledgements, groups, counts, repeated-child uniqueness, table totals and column
comparisons through both published workflows. Rejected saves, checks and submissions
retain the stored answers and revision; corrected answers reach final submission.
`tests/e2e/field-rules.spec.ts` exercises Preview and entry, bilingual relational/limit
errors through real GCDS controls, conditional required semantics, table uniqueness and
error association, draft save, server rejection and successful submission through the UI.
