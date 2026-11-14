# Software Requirements Specification

## 1. Purpose and Scope

The Campus Open-Source Contribution & Issue Tracker is a web platform for students to discover campus software projects, request to join them, report bugs, suggest features, discuss issues, and build a record of contributions verified by project owners. Administrators moderate project submissions and users.

The initial release is a single-campus MVP, built and operated by one developer. It provides its own project and issue workflow; GitHub integration, automated code analysis, and AI features are out of scope. Project owners may link to external repositories, but the platform does not claim that linked work has been independently verified.

## 2. Stakeholders and Assumptions

- Students contribute to approved campus projects.
- Project owners manage projects they own and verify contributions to those projects.
- Administrators moderate platform-wide content and accounts.
- The first deployment serves one college community. The data model should allow a campus identifier to be added later, but multi-tenant campus administration is not an MVP requirement.
- Users are expected to be at least eligible members of the participating campus. Email-domain enforcement is a deployment policy decision, not a substitute for account security.
- Project and contribution verification is a human decision. The system records who made the decision and when.
- The MVP is responsive and usable on current desktop and mobile browsers.

## 3. Product Goals and Success Criteria

- A student can register, discover an approved project, request membership, and report or discuss an issue.
- An owner can manage a project, process requests, assign issues, and verify a submitted contribution.
- An administrator can review projects and take basic moderation actions.
- Authorization is enforced by the API, not only by hiding frontend controls.
- A verified contribution is traceable to its contributor, project, issue when applicable, verifier, and verification time.
- A new deployment can be configured without committing secrets or relying on fake API data.

## 4. Functional Requirements

### 4.1 Authentication and Account

- FR-01: A visitor can register with a name, campus email, and password.
- FR-02: The system validates required fields, email format, password policy, and duplicate accounts.
- FR-03: A registered user can log in and log out.
- FR-04: The system stores only a salted, adaptive password hash and never returns it from an API.
- FR-05: Authenticated users can view and update permitted profile fields, including display name, bio, skills, and optional avatar URL.
- FR-06: Users can view a public profile and its verified contribution history, subject to privacy settings.
- FR-07: Users can request account deactivation; destructive deletion and retention policy require an administrative policy decision.

### 4.2 Projects and Discovery

- FR-08: An authenticated student can submit a project with name, description, repository URL, tags, and optional documentation URL.
- FR-09: New projects enter a pending moderation state and are not listed in public discovery until approved.
- FR-10: An owner can edit or archive a project they own. Ownership cannot be changed by an ordinary student through a client-supplied owner ID.
- FR-11: Users can browse approved projects and filter or search by text, tags, and project activity/status.
- FR-12: Project details show its description, links, owner, tags, membership state, and issues that are visible to the requesting user.
- FR-13: An administrator can approve or reject a pending project and record a reason for rejection.

### 4.3 Membership

- FR-14: A student can submit a join request with an optional message for an approved project.
- FR-15: A project owner can view, approve, or reject requests for their project.
- FR-16: The system prevents duplicate active requests and records request status, decision-maker, and decision time.
- FR-17: Accepted applicants become project members. Owners and administrators can view a project's member list.
- FR-18: A member can leave a project; an owner cannot remove themselves as the only owner without first transferring ownership or archiving the project.

### 4.4 Issues and Discussion

- FR-19: A project member can create an issue classified as bug or feature request, with title, description, and optional reproduction steps or acceptance criteria.
- FR-20: Issue creation and comment inputs are validated and length-limited. URLs are treated as untrusted input.
- FR-21: A project owner can triage issues, assign them to project members, and update their status.
- FR-22: Project members can view and comment on project issues. Public visibility for issue discussions is a project policy; MVP defaults to approved-project issues being visible to authenticated campus users, with comments limited to members. The owner may restrict visibility for sensitive issues.
- FR-23: Authors can edit or delete their own comment while the issue is open, subject to audit and moderation policy. Owners/admins can hide abusive content.
- FR-24: Issue status changes are validated against allowed transitions and attributed to the acting user.

### 4.5 Contribution Verification and History

- FR-25: A project member can submit a contribution linked to an issue, including a summary and optional external evidence URL.
- FR-26: The project owner can verify or reject a submission and provide a decision note.
- FR-27: A verified contribution records contributor, project, related issue, verifier, timestamps, and evidence reference where supplied.
- FR-28: A contributor can view their contribution history and current verification state.
- FR-29: A user cannot verify their own contribution unless an administrator performs an explicitly audited exception.

### 4.6 Administration and Activity

- FR-30: An administrator can find users and suspend or restore accounts with an auditable reason.
- FR-31: An administrator can review, approve, reject, or archive projects and moderate reported content.
- FR-32: Administrative actions record actor, target, action, timestamp, and reason.
- FR-33: The MVP provides a basic administrative view of pending projects, reported content, and recent moderation actions; it does not require analytics or exports.

### 4.7 System Behavior

- FR-34: List endpoints support bounded pagination, stable sorting, and validated filters.
- FR-35: API errors use a consistent response shape and do not expose stack traces, secrets, or database details in production.
- FR-36: The client displays loading, empty, success, and recoverable error states for data-driven workflows.

## 5. Non-Functional Requirements

- NFR-01 Security: Enforce authentication, role/resource authorization, input validation, secure session handling, and least privilege on every protected API operation.
- NFR-02 Privacy: Collect only data needed for platform workflows. Do not expose private email addresses, password hashes, session tokens, or moderation-only notes in public responses.
- NFR-03 Reliability: Persist approved user actions in MongoDB and return an explicit failure when persistence fails; do not present mocked success as completion.
- NFR-04 Performance: For the expected pilot scale (up to a few thousand users and tens of thousands of issues/comments), common paginated reads should target under 500 ms at the API under normal deployment conditions. This is a target, not a guarantee before load testing.
- NFR-05 Usability: Core student and owner workflows must be keyboard-operable, have clear validation feedback, and avoid relying on color alone.
- NFR-06 Accessibility: Target WCAG 2.1 AA for key workflows, including labels, focus visibility, semantic headings, contrast, and screen-reader status announcements.
- NFR-07 Compatibility: Support current stable Chrome, Edge, Firefox, and Safari, with responsive layouts for narrow screens.
- NFR-08 Maintainability: Use JavaScript modules, clear client/server boundaries, reusable validation and authorization utilities, and documented environment configuration.
- NFR-09 Observability: Log request failures and security-relevant administrative actions without logging passwords, tokens, or unnecessary personal data.
- NFR-10 Scalability: Keep the stateless API horizontally deployable; use database indexes and bounded queries. Do not introduce queues or microservices for the MVP.
- NFR-11 Portability: Separate local, test, and production configuration through environment variables. A developer must be able to run the application with documented prerequisites.
- NFR-12 Recovery: Define database backup and restore procedures before production launch; verify a restore at least once before inviting campus users.

## 6. User Roles and Permissions

The account role is `student` or `admin`. Project ownership and membership are resource-scoped relationships, not additional global roles. A project creator becomes its initial owner. An admin retains platform-wide moderation permissions.

| Capability | Visitor | Student | Project owner | Admin |
|---|---|---|---|---|
| Browse approved projects and public profiles | Read | Read | Read | Read |
| Register, authenticate, edit own profile | No | Own account | Own account | Own account |
| Submit project | No | Yes | Yes | Yes |
| Edit/archive a project | No | No | Owned project | Any project, audited |
| Moderate project approval | No | No | No | Yes |
| Request or leave membership | No | Yes | As member of other projects | As user; may moderate |
| Decide join requests | No | No | Owned project | Audited override |
| Create issues/comments | No | Per project policy | Yes | Moderation override |
| Assign issues/change project issue state | No | No | Owned project | Audited override |
| Submit contribution | No | Project member | Project member | Only as contributor; no self-verification |
| Verify contribution | No | No | Owned project, not own submission | Audited exception only |
| Suspend users/moderate content | No | No | Limited to own project content | Yes |

All permissions must be checked server-side using the authenticated identity plus the target resource's owner/member state. Client-supplied role, owner, verifier, or decision-maker fields are ignored or rejected.

## 7. User Journeys

### Student discovers and joins a project

1. Browse approved projects and filter by interest or skill.
2. Open project details and review repository, activity, and open issues.
3. Sign in or register if needed.
4. Submit a join request with a short message.
5. See request state and receive an in-app status update when the owner decides.
6. On approval, access member actions and create or comment on issues.

### Project owner runs a project

1. Register and submit a project for moderation.
2. After approval, update project information and review join requests.
3. Approve suitable applicants.
4. Triage issues, assign work to members, and manage status.
5. Review submitted contribution evidence and verify or reject it with a note.

### Student reports and completes work

1. Open a project and report a bug or propose a feature using the appropriate fields.
2. Follow discussion and status changes; comment when authorized.
3. After completing work, submit a contribution linked to the issue with a summary and optional repository/PR URL.
4. Track pending, verified, or rejected state and see verified work in contribution history.

### Administrator moderates the platform

1. Sign in to the restricted admin area.
2. Review pending project details and approve or reject with a reason.
3. Review reports or account concerns and take proportionate action.
4. Inspect the audit trail for moderation decisions.

## 8. Use-Case Descriptions

| ID | Use case | Primary actor | Preconditions | Main result |
|---|---|---|---|---|
| UC-01 | Register and sign in | Visitor/student | Valid campus email and password | Authenticated account with student role |
| UC-02 | Submit project | Student | Authenticated | Pending project owned by submitter |
| UC-03 | Moderate project | Admin | Pending project | Approved project becomes discoverable, or rejection reason is recorded |
| UC-04 | Request membership | Student | Approved project; no active request/member record | Pending membership request |
| UC-05 | Decide membership request | Project owner | Request belongs to an owned project | Applicant is accepted as member or request is rejected |
| UC-06 | Create and triage issue | Member/project owner | Approved project; actor authorized | Valid issue with auditable status and optional assignee |
| UC-07 | Discuss issue | Project member | Issue visible and comments allowed | Comment is stored and attributed to author |
| UC-08 | Submit contribution | Project member | Related issue/project exists | Contribution enters submitted state |
| UC-09 | Verify contribution | Project owner | Submission is for owned project and actor is not contributor | Verified/rejected record with reviewer and timestamp |
| UC-10 | Moderate account/content | Admin | Authenticated admin | Audited moderation action and updated visibility/account state |

## 9. Feature Breakdown and Prioritization

### Essential MVP

- Registration, login/logout, password hashing, authenticated profile editing.
- Student and admin global roles; project owner/member resource permissions.
- Project submission, admin approval/rejection, owner project management, discovery/search/filter.
- Membership requests, owner decisions, membership list and leave action.
- Bug and feature issue types, issue detail, assignment, status changes, comments.
- Contribution submission, owner verification/rejection, contribution history.
- Minimal admin moderation queue and audit records.
- Responsive accessible UI, validated APIs, production-safe errors, basic logs, deployment and backup procedure.

### Optional / Post-MVP

- Campus email verification, password reset, and account recovery if not supported by the initial identity provider.
- Email and in-app notifications, digest preferences, real-time updates.
- GitHub OAuth, repository/PR synchronization, webhook processing, automated contribution evidence checks.
- Multiple campuses, campus-specific administrators, invitations, organization groups.
- Advanced search, saved searches, labels, milestones, issue templates, markdown preview.
- Project analytics, exports, badges, leaderboards, and gamification.
- File uploads, attachments, advanced moderation reports, appeals, and configurable retention.
- SSO, fine-grained custom roles, audit export, service-level dashboards, and high-availability infrastructure.
- AI features are explicitly excluded from the initial MVP.

## 10. Acceptance Criteria for MVP Completion

- A clean deployment can register two users, authenticate them, and persist all workflow data to MongoDB.
- A student-created project stays hidden from discovery until an admin approves it.
- A non-owner cannot manage another project's requests, issues, or contributions by changing request IDs.
- A member can submit an issue and contribution; the owner can verify another user's submission; self-verification is rejected.
- Verified contribution history is attributable and consistent after logout/login and page reload.
- Invalid input, unauthenticated access, and unauthorized access return appropriate errors without leaking sensitive details.
- Primary workflows pass automated tests and manual responsive/accessibility smoke checks.
- Production deployment uses TLS, managed secrets, restricted database access, and a tested backup/restore procedure.
