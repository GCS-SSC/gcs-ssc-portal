# GC Design System UI architecture

This is the required component-selection and composition policy for the portal. Read it before changing shared UI or GCDS integration components. It supplements [ui-components.md](ui-components.md), [ui-patterns.md](ui-patterns.md), and [required-fields.md](required-fields.md).

Reviewed against the [official component catalogue](https://design-system.canada.ca/en/components/) on 2026-09-25 and the installed `@gcds-core/components` / `@gcds-core/components-vue` packages. Consult each component's **Use case**, **Design**, and **Code** documentation when implementing it; confirm the API against the installed version. Online documentation can describe capabilities newer than a project's dependency.

## Reference priority and sizing

Use MyACOA as a reference for the sizing, layout, and composition of the GCDS components it actually uses. Treat its third-party components as possible historical gaps, not evidence that GCDS still lacks a capability. The current official catalogue takes precedence for component selection: in particular, use the released GCDS Table instead of reproducing MyACOA's PrimeReact table.

For every UI task, revisit the relevant catalogue entries for newly released components and changed guidance. Confirm availability in the installed dependency. If the needed official component requires a newer release, evaluate a focused dependency upgrade and verify the application; an older installed package alone is not a reason to build a substitute. Record a specific compatibility blocker if an upgrade cannot be used.

Start sizing with the official component defaults and documented Container/Grid sizing, centring, padding, and responsive options. Align the shell, breadcrumb region, content width, and nested readable text areas deliberately. Use official typography and spacing scales, and check desktop and mobile results against the reference's proportions. Do not translate a screenshot into arbitrary pixel widths or copy hashed layout classes. Read [Container code](https://design-system.canada.ca/en/components/container/code/) for supported sizing options; verify the exact API in the installed version before implementation.

## Component selection is a requirement

Use the official GCDS component whenever it covers the UI responsibility. Do not recreate it with styled HTML, another vendor's widget, or a custom Vue control. This applies to layout and typography as well as interactive controls. A visually similar result is not an equivalent implementation.

The shared `Portal*` adapters remain the application boundary. They translate the portal's typed props, events, localization, and routing to official components; they must not become an independent visual component system. Business components such as `OrganizationFunding` can compose adapters and own data fetching without inventing new presentation primitives.

Before implementing UI:

1. Find the matching official component and read its documentation. Check the installed exports, props, slots, events, and rendered semantics.
2. Reuse the existing GCDS integration component. When the shared contract lacks the needed primitive, extend the contract and implement the GCDS integration. Do not bypass the integration boundary with vendor imports outside `app/components/ui/` and the registration plugin or recreate the component in shared CSS.
3. Use the component's supported options and composition before adding styles or behavior.
4. For a genuine capability gap, record the missing behavior, the components considered, the installed version, and the smallest fallback in this document. Use semantic HTML and documented GCDS CSS shortcuts/tokens for that gap. A missing adapter is not a missing GCDS capability. Do not add another UI library just because a reference application used it.

These are portal architecture rules. The official catalogue itself permits CSS shortcuts for gaps; our policy makes documenting those gaps mandatory.

## Page composition

Use this responsibility structure, adapted from the supplied MyACOA markup and the official component guidance. It is a composition model, not a copyable template or a claim that all these adapters already exist.

```text
PortalShell
  GcdsHeader — government identity and skip link
    toggle slot: GcdsLangToggle
    menu slot: GcdsTopNav
      home slot: GcdsNavLink — portal identity/home destination
      GcdsNavGroup + GcdsNavLink — authorized account destinations
      GcdsButton — sign-out action
  GcdsContainer layout="page"
    GcdsBreadcrumbs + GcdsBreadcrumbsItem — parent hierarchy, before main
  one main landmark, with the skip-link destination
    GcdsContainer layout="page" — page width and spacing
      GcdsHeading — one page-level h1
      optional GcdsGrid — workspace navigation and active content
      sections with GcdsHeading, GcdsText, controls, and data views
  GcdsFooter
```

The host owns destinations, authorization, content, and active organization. The shell owns shared landmarks and navigation presentation. Pages must not add a second government header, footer, or main landmark.

- **Header and footer:** use the native components and their slots. Keep the signature, language toggle, portal navigation, and account actions in the shell. Do not introduce a second custom navigation bar below the header. Preserve the native mobile menu, keyboard interactions, focus behavior, and language updates. See [Header](https://design-system.canada.ca/en/components/header/) and [Top navigation](https://design-system.canada.ca/en/components/top-navigation/).
- **Main and containers:** retain one actual main landmark and a focusable skip-link destination. A custom element with `id="main-content"` does not by itself prove that a main landmark exists. Use [Container](https://design-system.canada.ca/en/components/container/) for width, alignment, and content grouping, and Grid for columns. Nest containers only when a distinct content width or grouping is needed, not to reproduce incidental wrappers from MyACOA.
- **Breadcrumbs:** represent parent hierarchy, not browser history or every in-page section selection. Place breadcrumbs before the main landmark so the skip link skips all navigation. The page heading identifies the current location. Use the [Breadcrumbs component](https://design-system.canada.ca/en/components/breadcrumbs/) when needed, with real parent destinations.
- **Typography:** use [Heading](https://design-system.canada.ca/en/components/heading/) with explicit semantic levels and [Text](https://design-system.canada.ca/en/components/text/) for paragraph presentation. Let the component provide its typography and heading decoration. Do not paint a second red heading rule with `h1::after`. Lists, emphasis, and definition lists still need correct semantic structure; do not force block content into a component that renders a paragraph.
- **Document metadata:** the application manages the document language, viewport, and one effective page title. Do not reproduce the duplicate title elements in the supplied HTML.

## Component map

The GCDS column is the implementation choice inside the integration component, not permission to use vendor tags in host pages. Check the [catalogue](https://design-system.canada.ca/en/components/) for components beyond this map.

| Responsibility                            | GCDS choice                                                                      | Portal rule                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Government identity and global navigation | Header, Footer, Language toggle, Top navigation, Nav link, Nav group             | Compose in `PortalShell`; use real authorized destinations.                                                         |
| Page width and columns                    | Container, Grid                                                                  | Use their supported sizing and responsive options before custom layout rules.                                       |
| Hierarchy and content                     | Breadcrumbs, Heading, Text, Screenreader-only                                    | Preserve meaningful heading levels and accessible names.                                                            |
| Navigation and actions                    | Link, Button                                                                     | Links navigate; buttons execute actions or change local state. Do not restyle one to conceal the other's semantics. |
| Hierarchical page navigation              | Side navigation with navigation links                                            | Use for the documented page-navigation purpose; see the workspace rule below.                                       |
| Forms                                     | Input, Textarea, Select, Checkboxes, Radios, Date input, Fieldset, File uploader | Preserve labels, hints, required indicators, errors, and actual submitted values.                                   |
| Validation                                | Error message, Error summary                                                     | Tie errors to the controls and support correction and focus recovery.                                               |
| Context and feedback                      | Notice; Alert where the installed API fits event-driven feedback                 | Choose according to purpose and announcement needs, not colour alone.                                               |
| Records and pagination                    | Table, Pagination                                                                | Keep data fetching and server pagination outside presentation adapters.                                             |
| Progressive disclosure and process        | Details, Stepper                                                                 | Use only when the task calls for disclosure or a multi-step process.                                                |
| Actionable summaries and icons            | Card, Icon                                                                       | Use for their documented purpose; do not default to card grids or import a second icon system.                      |

The installed Vue package currently exports `GcdsTable` and `GcdsAlert`. Do not claim these capabilities are absent based on older knowledge. Read [Table code](https://design-system.canada.ca/en/components/table/code/) before mapping columns, data, actions, sorting, or pagination. Use [Notice guidance](https://design-system.canada.ca/en/components/notice/) to distinguish page context from validation and transient feedback.

## Workspace navigation

Keep organization identity and its menu stable while switching Overview, Agreements, Apply for funding, People, Invitations, and Settings. Agreements list the organization's funding agreements; selecting one reveals its published form sets. Drafts and submitted responses live within their related form workflow, not as a second top-level list. Do not reintroduce separate full-page navigation for items in that same menu.

[Side navigation](https://design-system.canada.ca/en/components/side-navigation/) is documented as page links. It must not be substituted blindly for state-changing buttons. The workspace now uses route-backed section links within the same organization page. `PortalSideNav` uses the official component and preserves in-page interaction, active state, browser history, keyboard behavior, and accessible semantics. Do not invent a `gcds-tabs` API or mix page navigation and local switching merely to achieve matching styles.

## Reference layout decisions

The supplied MyACOA screenshots establish a stable visual baseline for this portal's GCDS shell. The native top-navigation band has a light neutral background and spans the viewport. Its home-slot portal link is vertically centered and has no active underline or bottom border; do not mark this brand link `current`, because the installed GCDS Top navigation draws a bottom border for current links. A small native GCDS Sign in link button sits at the far end of the band for signed-out visitors, and the signed-in shell uses a matching small Sign out action. Both account actions must sit vertically centered in the navigation band. The installed Top navigation bottom-aligns its default list, so the shared shell gives its account button a `100` bottom spacing offset on desktop and tablet; the mobile menu keeps its own spacing. Its content, breadcrumbs, and page heading share the page-container alignment. The first H1 follows the navigation or breadcrumb row with a modest GCDS spacing step. Do not add an eyebrow or service label above the H1 when the navigation already identifies the portal. Keep breadcrumb spacing compact on sign-in and other short pages. Primary page actions retain regular size.

The installed Header reserves a `600` (48 px) bottom margin. The shell offsets one `400` spacing step on the immediately following breadcrumb or main container, leaving a small deliberate gap without changing the Header's shadow styles. Keep this adjustment in the shell only. At tablet width, organization navigation and content stay side by side so a six-item menu does not push the active section below the fold. On mobile the native header and side navigation both have a button labelled “Menu”; provide visible “Manage organization” context above the second button, since the installed Side navigation has no documented visible trigger-label property.

On the public landing page, one H1 introduces the portal immediately after the shell. The Get started action and returning-user link have an explicit GCDS spacing gap. The three onboarding steps form one semantic ordered list rendered by a responsive GCDS Grid. Each step has a GCDS Heading and Text, with a large sequence number in the same Lato heading type and a restrained blue top rule. Native browser list markers are hidden on each item so they cannot clash with the heading type; the Grid's `ol` retains the list semantics. This static overview is neither a [Stepper](https://design-system.canada.ca/en/components/stepper/) (which tracks a person's current step across pages) nor a [Card](https://design-system.canada.ca/en/components/card/) (which navigates to linked content). Semantic list decoration with GCDS tokens is the bounded fallback for this capability gap. These sections explain the sequence rather than display unexplained metrics.

An organization overview contains identity facts only, as one definition list with a single ending rule. Omit redundant access explanations below it; People and Settings expose actions in context. Render opaque IDs inside semantic `code` so they are easy to isolate and copy. Do not add a second divider after the final fact.

Use borders to separate peers, not to end a one-item list. Where a section needs its own boundary, use one rule and one intentional spacing step; do not stack a last-row border with a section border. Keep tablet/mobile action groups within their related content rather than spreading a heading and its action across a narrow row.

Use the native GCDS Textarea for long organization descriptions; a single-line Input obscures existing text at mobile widths. Its required state, label, hint, maximum length, and model-value bridge must follow [required-fields.md](required-fields.md), just like other fields.

Apply for funding groups published calls under their agency. A labelled GCDS Input filters the already loaded list by agency, call, program, and stream, and announces an empty match state. This is an in-page filter, not a site-wide search request; [GCDS Search](https://design-system.canada.ca/en/components/search/code/) is designed around a submitted search endpoint and is not substituted for a live list filter. Each call separates its title, status, form link, and start action using the spacing scale.
For long lists, show the call title, program/stream, date range, status, and actions as a compact summary. Repeated Start application actions use small secondary GCDS buttons; a page should not display a dozen competing primary buttons. Do not give every short fact a full-width ruled row. Agency grouping is presentation only; the server still controls visibility and permissions.

## Tables, forms, and state

MyACOA separates record lists into titled sections, gives tables accessible names, shows useful empty states, and places creation actions with their related list. Adopt those organizational principles. Its PrimeReact table and input markup is not the portal's implementation choice: use the GCDS equivalents through adapters.

Preserve stable record identifiers, server-owned filtering/pagination, loading, empty, error, retry, and permission-dependent action states. Do not infer pagination, authorization, or concurrency behavior from a DOM snapshot. Inspect the actual caller and API before changing data behavior.

The official [Table guidance](https://design-system.canada.ca/en/components/table/) describes mobile column removal. Verify which information remains available and how users reach omitted record details; do not hide essential actions or silently discard required comparison data.

Apply [required-fields.md](required-fields.md) to every form adapter. Test the real focusable input inside the web component: attributes on its host do not establish native validation or accessible state on the inner control. Choose feedback intentionally; do not import MyACOA's toast, dialog, loading-indicator library, Font Awesome CDN, generated CSS, or framework dependencies from its HTML dump.

## Styling and web-component integration

Follow the [design token guidance](https://design-system.canada.ca/en/styles/design-tokens/): prefer semantic global tokens for application styling, use base tokens where needed, and keep component tokens attached to their intended components. Verify token names in the installed stylesheet. Do not invent token names or compensate for a missing token with an unexplained hard-coded value.

Keep vendor styles and narrowly necessary integration styles in `app/components/ui/` and `app/assets/css/gcds.css`. Shared CSS must not impose a competing palette, font scale, heading decoration, control appearance, or navigation skin on GCDS. Avoid broad resets, root font-size changes that rescale vendor `rem` values, blanket `!important`, and selectors reaching into private shadow internals. Use documented properties, slots, tokens, and public parts; an exposed part is not permission to redesign the component.

Adapters may bridge documented events to Vue events, native form submission, locale state, and routing. Verify event cancellation, one action per activation, SSR/hydration, and keyboard activation in a browser. Do not copy runtime `hydrated` classes, framework-generated hashes, or duplicate ARIA roles from rendered reference markup into source templates.

## Stable presentation contract

The application uses GCDS 1.6.0 through `Portal*` adapters. The MyACOA reference informs composition and proportions; the installed official component API controls implementation. Changes to this contract belong here and in the adapters, not in individual pages.

- **Button sizing:** primary task actions use the native `size="regular"`. The header sign-out and dense table actions use the documented native `size="small"`; this matches the MyACOA header and keeps row actions proportional. Use `primary`, `secondary`, and `danger` for purpose, never arbitrary dimensions for emphasis. Preserve visible focus and sufficient spacing around small targets. Button text may wrap naturally; do not impose fixed heights or widths. See [Button code](https://design-system.canada.ca/en/components/button/code/).
- **Button semantics:** `PortalButton` performs an action. `PortalLink variant="button"` uses native Button `type="link"` for a prominent destination. Ordinary links use Link. The custom link-looking button variant and painted primary-link class have been removed.
- **Sizing baseline:** never set a root font size or root font shorthand. It rescales vendor rem values (the previous 18px desktop root enlarged controls by 12.5%). Browser font preferences must remain effective. Body text uses the official desktop/mobile typography tokens; individual paragraphs and headings use Text and Heading defaults.
- **Layout:** shell content uses Container `layout="page"` to align with the header/footer at every breakpoint. Form pages use Container `size="md"`. Workspace columns and the landing-page columns use Grid, with a single column on narrow screens. Flex layout is reserved for intrinsic action groups and semantic definition/list content rather than reimplementing Container/Grid.
- **Navigation:** workspace sections use Side navigation with actual `?section=` destinations. Ordinary activation uses Nuxt navigation without remounting the organization workspace; modified clicks retain browser link behavior. The current section survives refresh and history navigation. Legacy funding/work URLs redirect to the matching workspace section; record back links return there too. Focus moves to the labelled content region after switching. Authorization remains server-owned; unavailable sections have no menu entry.
- **Breadcrumbs:** the shell renders parent destinations before the main landmark, using the native Breadcrumbs components and the same page container. The H1 identifies the current location. Workspace query changes do not add breadcrumb levels.
- **People actions:** keep a concise role and subject-access summary readable in the GCDS Table. Show one small “Edit” action per person, with accessible person-specific context; the focused editor below the table contains the administrator action and four subject selectors. Keep the owner's fixed administrator status in that editor, not as long prose in the Actions cell. Do not squeeze controls or a disclosure into a table cell.
- **Data views:** existing record tables use Table with a caption, live Vue cell slots, and localized labels. The adapter leaves generic filtering, sorting, and pagination disabled; the funding-call page owns its explicit list filter. Do not add client pagination to a server-paginated endpoint. Row actions and permission controls must remain accessible on mobile.
- **CSS ownership:** GCDS owns heading decoration, fonts, palette, control dimensions, focus rings, and navigation appearance. Application CSS only composes spacing/layout and documented semantic gaps. Never style component shadow parts to create a second visual variant.

## GCDS integration notes

The 1.6.0 Vue Table slot wrapper does not register the underlying custom element. `PortalTable` explicitly calls the official Table registration function. The core table identifies rows by index while the Vue wrapper prefers `data.id`; the adapter supplies matching index IDs to the vendor and keeps original domain rows in typed cell slots. No business identifier is changed. Recheck this bridge when upgrading GCDS, and verify that live cell controls still submit and update the correct record. Never render Vue actions through cloned HTML templates.

## Bounded fallbacks

- `PortalBadge` is readable status text, not an interactive control. The reviewed catalogue has no badge component. It uses official typography, spacing and colour tokens; meaning must remain readable without colour. Recheck the catalogue before extending it.
- Semantic definition lists and inline groups retain native HTML; their spacing uses GCDS tokens. Do not force lists, definitions, forms, or headings into Text, which renders a paragraph.
- Survey date questions currently accept ISO date strings through Input with a localized format hint. Replacing this with Date input requires an explicit date-parts/string adapter, validation and round-trip tests; a control swap must not change the persisted survey contract.

## Review and verification

For each UI change, reviewers must be able to identify the official component used, the relevant documentation, any necessary adapter addition, and any documented gap. Reject replacement implementations where a suitable official component exists.

Verify the actual rendered behavior in the application: heading hierarchy and landmarks, native required fields, language persistence, keyboard navigation, active state, focus after switching content, mobile layout, empty/error recovery, and unchanged authorization. Test accessible state on the interactive element as well as visual state on a web-component host. Label native sections explicitly when their headings are rendered inside a shadow component; do not rely on cross-shadow ID references. Dynamic row-action names use visible text plus Screenreader-only record context, so they update when permissions change.

Run the configured lint, type, unit, and browser checks for implementation changes. The `tests/tooling/ui.test.ts` guards vendor isolation, rejects replacement headings/paragraphs/tables/fieldsets in host code, and rejects root-font scaling and shadow-part restyling in shared CSS. Browser journeys compare header/action button heights, exercise live table actions and mobile permission editing, and check section history, focus and keyboard navigation. These checks support review; they do **not** prove complete visual fidelity or accessibility. Documentation-only changes require link/reference and formatting checks rather than rebuilding the application.
