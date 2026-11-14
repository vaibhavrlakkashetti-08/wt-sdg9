# REST API Reference

## Conventions

- Resource endpoints in this phase are mounted under `/api`; authentication endpoints remain under `/api/v1/auth` as documented in [AUTHENTICATION.md](AUTHENTICATION.md).
- JSON success responses use `{ "data": { ... }, "meta": { ... } }`. `meta` is present on paginated lists.
- Errors use `{ "error": { "code": "...", "message": "...", "details": [] } }` where field details apply.
- Pagination query parameters are `page` (default `1`) and `limit` (default `20`, maximum `100`). List responses include `page`, `limit`, `total`, and `totalPages` in `meta`.
- Object IDs are MongoDB ObjectIds. Invalid IDs return `400`; missing or non-visible resources return `404`.
- Authenticated requests may send the HttpOnly `access_token` cookie or an `Authorization: Bearer <token>` header. Never put tokens in localStorage. See [AUTHENTICATION.md](AUTHENTICATION.md) for registration, login, logout, token lifetime, and cookie settings.
- `student` and `admin` are global roles. Project ownership and membership are resource-scoped: an accepted JoinRequest is a membership. Admin status and account status are read from MongoDB, not trusted from a token claim.

## Projects

### `POST /api/projects`

Authentication: student or admin. Creates a project owned by the authenticated user with status `pending`; clients cannot set `owner` or moderation status.

Request:

```json
{
  "title": "Campus map",
  "description": "A student-maintained map of campus resources.",
  "repositoryUrl": "https://github.com/campus/map",
  "technologies": ["React", "Node.js"],
  "visibility": "public"
}
```

`visibility` is optional and defaults to `public`. Success is `201` with `{ "data": { "project": { ... } } }`.

### `GET /api/projects`

Authentication: optional. Lists approved public projects by default. Query parameters:

- `search`: case-insensitive match against title, description, or technology.
- `technology`: case-insensitive exact technology filter.
- `page`, `limit`: pagination.
- `sort`: `newest` (default), `updated`, or `title`.
- `mine=true`: authenticated owner’s non-archived projects; optional `status` may select `pending`, `approved`, or `rejected`.
- `status`: non-`approved` lists are restricted to the owner’s `mine=true` query or an admin.

Returns `{ "data": { "projects": [] }, "meta": { ... } }`.

### `GET /api/projects/:projectId`

Authentication: optional for approved public projects. Owners, approved members, or admins may view their non-public/non-approved projects. Private resources are concealed as `404` from other users. Project members are populated from approved JoinRequest records; member profiles omit email.

### `PUT /api/projects/:projectId`

Authentication: project owner or admin. Owners may update `title`, `description`, `repositoryUrl`, `technologies`, and `visibility`. Only admins may update `status` (`pending`, `approved`, `rejected`, `archived`) or `moderationNote`; a status decision records moderator and time. Attempts to change owner or other fields are rejected.

### `DELETE /api/projects/:projectId`

Authentication: project owner or admin. This endpoint **archives** the project (`status: archived`) rather than physically deleting it, preserving issue, comment, membership, and contribution history. Re-archiving returns `409`.

## Memberships and Join Requests

### `POST /api/projects/:projectId/join`

Authentication: student. Request body: `{ "message": "Optional note to the project owner." }` (message may be omitted). The project must be approved and public. Creates a pending request and returns `201`. Duplicate pending requests, existing memberships, or owner self-requests return `409`.

### `GET /api/projects/:projectId/requests`

Authentication: project owner or admin. Query: `status` (`pending` default, `approved`, `rejected`, `cancelled`), `page`, `limit`. Student emails are not included in the response.

### `PATCH /api/projects/:projectId/requests/:requestId`

Authentication: project owner or admin. Body: `{ "status": "approved" | "rejected", "decisionNote": "Optional reason." }`. Only a pending request may be decided; repeated decisions return `409`. MongoDB's partial unique indexes prevent duplicate pending requests and approved memberships.

### `DELETE /api/projects/:projectId/members/:userId`

Authentication: project owner or admin. Cancels the accepted JoinRequest membership and records who removed it. Returns the updated membership. Removing a missing member returns `404`; the project owner cannot be removed as an ordinary member (`409`).

## Issues

All issue endpoints require authentication. Issues may be read by authenticated campus users for approved public projects; private project issues are limited to the owner, approved members, and admins.

### `POST /api/issues`

Authentication: project owner, admin, or approved project member. Creates an open issue.

Request:

```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "title": "Map markers overlap",
  "description": "Markers overlap at narrow viewport widths.",
  "type": "bug",
  "priority": "medium"
}
```

`type` is `bug` or `feature`; `priority` is optional (`low`, `medium`, `high`, `urgent`; default `medium`). Reporter is the authenticated user; clients cannot choose status, reporter, or assignee. Success is `201`.

### `GET /api/issues`

Authentication: required. Query filters: `projectId`, `type`, `priority`, `status`, `assignee`, `reporter`, `search`, `sort`, `page`, `limit`. `search` case-insensitively matches issue title/description. `sort` accepts `newest` (default), `updated`, or `priority` (urgent, high, medium, low). The requested project is checked for visibility before applying the filter.

### `GET /api/issues/:issueId`

Authentication: required. Returns issue details with reporter, assignee, and project summary when visible to the requesting user.

### `GET /api/issues/:issueId/activity`

Authentication: required. Returns persisted status-change audit entries plus the issue's recorded creation event, ordered newest first. Query: `page`, `limit`. Comments remain available through the comments endpoint.

### `PUT /api/issues/:issueId`

Authentication: owner/admin may update any allowed issue field; the reporter may update only title/description while status is `open`. Allowed fields: `title`, `description`, `priority`, `status`, `assignee` (ObjectId or `null`). Status transitions are checked; assignees must be active project members or the project owner. Status changes are written to the audit log.

### `DELETE /api/issues/:issueId`

Authentication: project owner or admin. Physically deletes the issue only if no comments or contributions reference it; otherwise returns `409 ISSUE_HAS_HISTORY`. Success is `204` with no body.

## Comments

Comments are limited to the project owner, approved project members, and admins.

### `POST /api/issues/:issueId/comments`

Authentication: project participant. Body: `{ "content": "A useful discussion comment." }`. Closed or rejected issues do not accept new comments. Success is `201`.

### `GET /api/issues/:issueId/comments`

Authentication: project participant. Query: `page`, `limit`. Returns chronological comments and author display profiles.

### `DELETE /api/comments/:commentId`

Authentication: comment author, project owner, or admin. Success is `204`; other users receive `403`.

## Contributions

### `POST /api/issues/:issueId/contributions` (submission companion endpoint)

Authentication: project owner or approved project member. Added to complete the submit-then-verify workflow. Body:

```json
{
  "contributionType": "bug_fix",
  "summary": "Fixed marker overlap at narrow viewport widths.",
  "evidenceUrl": "https://github.com/campus/map/pull/42"
}
```

`contributionType` is `bug_fix`, `feature`, `documentation`, `testing`, `design`, or `other`. `evidenceUrl` is optional and must be HTTP(S). One pending contribution per user/issue is allowed; a partial unique MongoDB index prevents concurrent duplicates and duplicates return `409`.

### `POST /api/issues/:issueId/verify-contribution`

Authentication: project owner or admin, never the contributor. Body: `{ "contributionId": "507f1f77bcf86cd799439011", "verificationStatus": "verified" | "rejected", "decisionNote": "Optional note." }`. Contribution must belong to this issue and still be `submitted`; a repeated decision returns `409`. Verified records receive `verifiedBy`/`verifiedAt`; rejected records receive review actor/time. Decisions are audited.

### `GET /api/users/:userId/contributions`

Authentication: optional. Public responses include verified contributions only. The contributor and admins may request all states using `status=submitted|verified|rejected`; other users requesting a non-verified state receive `403`. Query also accepts `page` and `limit`. Project/issue summaries and reviewer display names are populated; private user data is not.

## Common Status Codes

- `200`: read or update succeeded.
- `201`: resource created.
- `204`: issue/comment physically deleted.
- `400`: invalid body, query, or ObjectId.
- `401`: missing/invalid authentication.
- `403`: authenticated but unauthorized.
- `404`: missing or intentionally concealed resource.
- `409`: duplicate request/state conflict or deletion blocked by history.
- `413`: request body exceeds the configured limit.
- `503`: database unavailable or service not configured.
