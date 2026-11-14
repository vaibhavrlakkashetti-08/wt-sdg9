# UI Design Specification

## 1. Design Intent

Create a focused campus developer workspace: familiar to people who use issue trackers, but welcoming to students who are new to open source. Prioritize project discovery, clear ownership, issue status, and trustworthy contribution history. The interface should feel like a product students use to do work, not a marketing dashboard.

### Visual direction

- Use a light-first neutral canvas, quiet borders, compact but readable data rows, and a restrained blue for primary actions and selected navigation.
- Use purposeful typography: **DM Sans** for interface text and **IBM Plex Mono** sparingly for issue IDs, repository names, keyboard-like metadata, and technical labels. Load locally or through an approved font provider with system fallbacks; do not block rendering on web fonts.
- Use a consistent 4px spacing base, mostly 8px increments. Prefer aligned page sections and unframed content areas. Use small-radius surfaces for repeated project/issue items; avoid nested cards and decorative dashboard clutter.
- Use real project and issue data in the application. Loading, error, and empty states are designed states, not fabricated successful API content.
- Provide a dark theme through semantic tokens, but ship light theme as the default. Theme choice must not change meaning or status colors.

## 2. Design Tokens

### Color palette

| Token | Light value | Dark value | Use |
|---|---|---|---|
| `canvas` | `#F6F8FB` | `#101318` | Overall app background |
| `surface` | `#FFFFFF` | `#181D24` | Main content and menus |
| `surface-subtle` | `#EEF2F7` | `#202731` | Secondary fields, hover rows, selected filters |
| `border` | `#D8DEE8` | `#343D49` | Dividers and control outlines |
| `text-primary` | `#17202D` | `#F0F3F8` | Headings and primary content |
| `text-secondary` | `#465365` | `#B4BFCE` | Descriptions and metadata |
| `text-muted` | `#596779` | `#97A4B5` | Supporting labels; maintain readable contrast |
| `primary` | `#2459C7` | `#8FB2FF` | Primary action, links, focus/selection accent |
| `primary-hover` | `#1949AD` | `#B0C8FF` | Hover/active primary action |
| `primary-soft` | `#E8F0FF` | `#222F47` | Selected navigation and subtle accent fills |
| `success` | `#176B45` | `#70D5A2` | Verified/complete states |
| `warning` | `#805400` | `#F0C36A` | Pending/needs attention states |
| `danger` | `#B4232F` | `#FF8D95` | Destructive actions, rejected/error states |
| `info` | `#2459C7` | `#8FB2FF` | Informational status |

Use dark foreground text on the light semantic status fills, and a sufficiently dark status fill behind light text in dark mode. Status must always have a text label and, where useful, an icon; color alone is not a signal. Validate final token pairs with a contrast checker during implementation. Body text and controls target WCAG AA contrast (4.5:1 for normal text; 3:1 for large text and meaningful UI boundaries).

### Typography scale

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `display` | 40 / 48px | 650 | Landing page product title only |
| `h1` | 30 / 38px | 650 | Page title |
| `h2` | 22 / 30px | 620 | Major page section |
| `h3` | 16 / 24px | 620 | Panel/list group heading |
| `body-lg` | 16 / 24px | 400 | Intro and primary descriptions |
| `body` | 14 / 21px | 400 | Default interface text |
| `label` | 13 / 18px | 560 | Inputs, compact controls, table headings |
| `meta` | 12 / 16px | 450 | Timestamps and secondary metadata |
| `code` | 12 / 18px | 450 | IDs, short technical strings (IBM Plex Mono) |

Use a 0 letter-spacing baseline. Avoid scaling type with viewport width; switch to a smaller named token only at defined breakpoints. Keep headings to one or two lines where possible and wrap long project names safely.

### Spacing, shape, and elevation

- Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`.
- Control heights: 36px compact, 40px default, 44px touch-friendly; icon controls have a stable square hit area of at least 40px on touch screens.
- Border radius: 4px inputs and small controls; 6px menus and dialogs; 8px repeated content surfaces. Avoid pill-shaped text buttons; pills are reserved for compact status/filter labels.
- Use borders to define structure; reserve shadows for overlays and dialogs. No nested cards.
- Content max width: 1200px for broad dashboards and tables; 760px for forms and focused reading views.

## 3. Responsive Breakpoints

Mobile-first breakpoints:

| Breakpoint | Width | Layout behavior |
|---|---:|---|
| `sm` | 640px | Expand form rows and simple two-column metadata |
| `md` | 768px | Desktop navigation begins; dashboard can use two columns |
| `lg` | 1024px | Persistent sidebar and wide project/issue layouts |
| `xl` | 1280px | Full content width and multi-column dashboard composition |

At less than 768px, collapse the sidebar into a labeled navigation drawer, keep a compact top bar, stack panels, convert data tables to labeled rows, and keep primary actions reachable. Never hide required issue fields or project actions solely to fit a table. At narrow widths, filters open in a sheet and apply/reset explicitly. Respect reduced-motion settings.

## 4. Navigation Structure

### Public shell

- Brand mark/name links to landing/discovery.
- Primary links: Explore projects, How it works (brief section anchor), Sign in.
- Primary action: Create account.

### Authenticated student shell

- Top bar: brand, global project search, notification placeholder only when notifications exist, theme control, profile menu.
- Sidebar: Overview, Explore projects, My projects, My issues, Contributions.
- Contextual project navigation on a project detail/manage area: Overview, Issues, Members, Join requests (owner only), Settings (owner only).
- Admin link appears only for authorized accounts. Navigation visibility is not an authorization control.

### Admin shell

- Overview, Project review, Users, Content moderation, Audit activity.
- Use a restrained admin marker and clear destructive-action confirmation; do not use a visually separate theme that implies different identity.

## 5. Reusable Component Inventory

Build and verify reusable components before composing all pages. Keep components semantic and domain-neutral where possible.

| Component | Purpose and states |
|---|---|
| `AppShell` | Public, authenticated, and admin layouts; handles responsive nav and content container |
| `PageHeader` | Breadcrumb, title, optional description, and right-aligned primary action |
| `Button` | Primary, secondary, quiet, destructive, icon-only; default, hover, focus, disabled, busy |
| `IconButton` | Stable square tool action with accessible name and tooltip for unfamiliar actions |
| `TextField` / `TextArea` | Label, hint, required, invalid, disabled; error connected with `aria-describedby` |
| `Select` / `Combobox` | Accessible native select where possible; searchable options for larger sets |
| `SearchField` | Search icon, clear action, keyboard access, responsive width |
| `FilterBar` | Search, filter controls, selected-filter summary, clear-all, mobile sheet behavior |
| `Tabs` | Related views with clear selected state and keyboard interaction |
| `StatusBadge` | Text + optional icon for project, issue, request, and contribution states |
| `StatTile` | Single label/value/trend or context; supports loading and unavailable states |
| `ProjectListItem` | Project name, short summary, technologies, owner, member/activity metadata, action |
| `IssueRow` / `IssueCard` | Type, title/ID, priority, status, reporter, assignee, created time |
| `Avatar` / `AvatarGroup` | Initial fallback, accessible name, overflow count; never communicates role by color alone |
| `ActivityFeed` | Actor, action, target, time; stable chronological order and empty state |
| `DataTable` | Sortable headers, selection where needed, responsive row rendering, pagination |
| `Dialog` / `Sheet` | Confirmations and mobile filters; focus trap, Escape handling, focus return |
| `Toast` / `InlineAlert` | Transient confirmation or persistent error with accessible announcement |
| `Skeleton` | Loading placeholders matching content geometry, with no misleading sample values |
| `EmptyState` | Brief explanation and relevant next action; no decorative illustration required |
| `Pagination` | Previous/next, current range, disabled edge states, accessible labels |
| `ConfirmAction` | Destructive or consequential action with target context and explicit confirmation |

## 6. Page-by-Page Specifications

### 1. Landing page (`/`)

- Public header with brand, Explore, Sign in, and Create account.
- First viewport identifies the product with the literal H1 **Campus Open Source** and concise supporting copy about campus projects and verified contributions.
- Keep the hero unframed and useful: text and primary action lead into a wide, real product interface preview below. Use an actual rendered interface image from the implemented product when available; do not invent impact metrics or use abstract gradient artwork.
- Show a short, scannable path: discover a project, contribute, get work verified. Follow with a project discovery preview only when backed by real approved API data; otherwise show a useful link to explore rather than fake project cards.
- Leave the start of the next section visible at desktop and mobile heights. Landing calls to action route to registration or discovery.

### 2. Registration (`/register`)

- Focused single-column form, constrained width; fields: name, campus email, password, password confirmation only if required by validation approach.
- Explain campus eligibility plainly; do not imply email verification unless implemented.
- Inline field errors, password visibility toggle with accessible label, busy submit, server conflict/error state, link to sign in.
- On success, show a clear confirmation and continue to the student dashboard or next actual account step.

### 3. Login (`/login`)

- Same visual shell and form width as registration for consistency.
- Email and password, password visibility toggle, submit action, link to account creation.
- Keep generic authentication failure copy; do not disclose whether an email is registered. Provide a password recovery link only once that workflow exists.
- Preserve return destination when authentication was triggered by a protected action.

### 4. Student dashboard (`/dashboard`)

- Welcome line with display name and one dominant next action: Explore projects. Do not use a giant decorative greeting.
- First row of compact stat tiles: active projects, assigned issues, open issues relevant to memberships, verified contributions. Use data with clear time/context labels.
- Main area: active project list and assigned issue list; secondary column/section: recent activity and contribution summary.
- Each panel has independent loading, empty, error/retry, and populated states. Empty states link to the relevant real action (explore, join, or create a project).
- On mobile, order content by next action, assigned work, active projects, contribution summary, then activity.

### 5. Explore projects (`/projects`)

- Page header, full-width search, filters for technology/tag and project activity; sort by recently updated or newest.
- Results show reusable `ProjectListItem` rows/cards with title, concise description, technology tags, owner, team size where available, and open issue count when returned by API.
- Use a compact grid on wide screens and a single-column list on small screens; avoid large promotional cards.
- No-results state offers clear-filter action. Initial empty state directs a student to create a project or check back; only show project submission when signed in.

### 6. Project details (`/projects/:projectId`)

- Header: project name, status (only visible to owner/admin if not approved), repository/docs links, owner and member avatars, primary contextual action: Join project, View request status, or Manage project.
- Main column: project description, technologies, open issues, recent project activity. Secondary rail on wide desktop: owner, team, contribution stats if data exists, and project links.
- Tabs or segmented navigation for Overview, Issues, and Members. Owner-only Join requests and Settings are contextual routes.
- Issues are visible according to project policy. Clearly distinguish read-only viewing from member-only comment/contribution actions.
- Joining uses a brief dialog with optional message; pending/approved/rejected states replace the action with explicit next state and no duplicate submit.

### 7. Create project (`/projects/new`)

- Focused form at a readable max width, grouped as project basics, links, and technologies.
- Fields: name, description, repository URL, optional documentation URL, technology/tag input. Show character limits and examples in hint text without bloating the page.
- Review summary/status notice explains that the project awaits admin approval and will not be public until approved.
- Inline validation, unsaved navigation warning when applicable, cancel/back, submit busy and error states.

### 8. Edit project (`/projects/:projectId/edit`)

- Reuse the create form and validation; prefill existing data from API.
- Show project approval state and explain if edits require re-review (only if the policy is implemented).
- Save changes and archive project are distinct actions. Archive requires confirmation and explains impact on discovery/issues.
- Do not let a client-side edit imply a saved state until the API confirms it.

### 9. My projects (`/my-projects`)

- Page header with Create project action.
- Tabs/filters: Owned, Member of, Pending requests/projects; show relevant counts only from API data.
- List rows communicate relationship and project status; owner actions include Manage, View requests, Edit. Member actions include Open project and Leave, with confirmation.
- Empty states differ by tab and link to Explore or Create. On mobile, expose actions through visible buttons or an accessible menu.

### 10. Join requests (`/projects/:projectId/requests`)

- Owner-only contextual project header and count of pending requests.
- Applicant row: avatar/name/profile, request message, requested date, current state, Approve and Reject actions.
- Confirmation is unnecessary for approve; rejection may request a short reason if that field is supported by API. After decision, row updates only after successful response and offers a recoverable error on failure.
- Provide pending/decided tabs and an explicit empty state. Never show requests from another project due to a route ID change.

### 11. Issue tracker (`/projects/:projectId/issues`)

- Project-scoped header and Create issue action when authorized.
- Search and filters: type (bug/feature), status, priority, assignee, reporter; show selected filters and clear-all.
- Desktop data table columns: title/ID, type, priority, status, reporter, assignee, created date. Sort by created/updated or priority when supported. Use `IssueRow` and status text + icon.
- Mobile converts each row into a labeled issue summary with title first, then type/status and people/date metadata. Filters open in a sheet.
- Support loading skeletons, no issues yet, no filter matches, and retryable API failure states.

### 12. Create issue (`/projects/:projectId/issues/new`)

- Reuse a focused form layout. Choose Bug or Feature request using a labeled segmented control.
- Common fields: title, description. Bug-specific fields: reproduction steps and expected/actual behavior. Feature-specific field: desired outcome or acceptance criteria.
- Priority and assignee controls are available only if the product policy allows the creator to set them; otherwise triage defaults apply and the owner assigns later.
- Show project context, validation errors, cancel, busy submit, and post-create navigation to issue details.

### 13. Issue details (`/issues/:issueId`)

- Breadcrumb to project and issue identifier in mono text. Main column: title, type/status/priority badges, description, reproduction or acceptance details, comment/activity timeline.
- Side panel on wide screens: reporter, assignee, created/updated dates, project link, owner controls for assignment/status.
- Member-only actions: comment and submit contribution. Contribution submission is a compact form/modal linked to this issue, with summary and optional evidence URL.
- Status changes show who changed the state and when. Distinguish comments from system activity. Include loading, deleted/unavailable, unauthorized, and empty discussion states.

### 14. Contribution history (`/contributions`)

- Show verified total as a single summary stat and a chronological list grouped by month or project. Do not gamify the count.
- Each entry: contribution summary, project, linked issue when present, verification state, verifier, verified/submitted date, and evidence link when supplied.
- Filters for status and project; pending/rejected records are private to the contributor and authorized reviewers, while public profiles show verified records only.
- Empty state links to an issue/project workflow; loading and error states do not show fabricated totals.

### 15. User profile (`/users/:userId`, own profile at `/profile`)

- Profile header: avatar, display name, bio, skills, joined date only if appropriate, and verified contribution count from persisted data.
- Public profile shows verified contribution history and projects that are explicitly public. Never expose email or moderation/account details.
- Own profile edit reuses form components and clearly separates editable fields from public presentation. Provide save/cancel and unsaved state feedback.
- Use a graceful initials avatar fallback and wrap long bios/skills without shifting layout.

### 16. Admin dashboard (`/admin`)

- Admin-only shell with top-level counts for pending projects and moderation items; no vanity charts in MVP.
- Main queue sorted by age/priority: pending projects, reported content when reporting exists, suspended/recently changed accounts. Recent admin activity appears as a compact audit list.
- Project review row exposes description, owner, repository link, submitted date, approve, and reject with reason. Consequential actions use a confirmation dialog.
- Users view supports search and status filter; account suspension/restoration requires reason and confirmation.
- Empty state confirms there are no pending items. Errors and loading states are explicit. Do not render moderation notes in public pages.

## 7. Interaction and State Rules

- Buttons: primary filled blue for the single most important action per region; secondary outlined/neutral; quiet for low-priority actions; destructive red only for destructive actions. Keep labels verb-led and specific.
- Forms: validate on submit and on blur after first error; preserve entered values after recoverable server errors; associate help/error text with controls. Disable duplicate submission while busy and announce completion/failure.
- Lists: maintain filter state in query parameters where useful so links can be shared and browser back/forward works. Keep pagination stable when returning from details.
- Dialogs/sheets: trap focus, support Escape when safe, return focus to trigger, and use explicit accessible titles. Do not use a dialog for routine navigation.
- Feedback: use inline alerts for persistent/field-specific issues and toasts for brief confirmed actions. Avoid success toast before server confirmation.
- Loading: use geometry-matched skeletons, not spinners for every panel. Respect reduced motion.
- Empty: state what is absent and give one relevant action, not generic encouragement.
- Destructive or irreversible actions: clearly name the affected project/account and offer Cancel as the safe default.

## 8. Accessibility and Quality Checks

- Target WCAG 2.1 AA for key flows. Use semantic landmarks, one `h1` per page, visible keyboard focus, logical tab order, programmatic labels, and accessible names for icon-only buttons.
- Ensure text reflows at 320px width and browser zoom; no clipped buttons, horizontal page scrolling, or overlapping page content.
- Use color contrast of at least 4.5:1 for normal text and non-color signals for issue/project/contribution status.
- Announce async form errors, successful actions, and result count updates with appropriate live regions without moving focus unexpectedly.
- Use accessible table semantics on desktop and equivalent labels when rows become mobile cards.
- Manually test keyboard navigation, screen-reader labels on critical controls, light/dark contrast, reduced motion, and 320px/768px/1024px/1440px widths.

## 9. Implementation Readiness Notes

- This document specifies visual and interaction behavior only; it does not add frontend code or backend functionality.
- Implement the shared tokens, shell, form controls, status badges, list items, and loading/empty/error patterns before composing all pages.
- Keep role-dependent visibility aligned with the SRS, but treat the API as the authority for permissions.
- Use only API-backed values in product metrics, activity, and project/issue lists. Seed/demo data, if ever needed for a separate showcase, must be clearly isolated from production workflows.
