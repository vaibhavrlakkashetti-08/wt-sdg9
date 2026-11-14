# Authentication API

## Session Design

- Registration creates a `student` account only. The client cannot choose a global role; project-owner permissions are derived from ownership/membership in each project.
- Passwords are hashed with `bcrypt` using 12 rounds by default. Passwords must be at least 12 characters and no more than 72 UTF-8 bytes (the bcrypt input limit). `confirmPassword` is optional, but if sent it must match.
- Access tokens are signed JWTs using HS256, issued for 15 minutes, with issuer `campus-issue-tracker` and the user ID in `sub`. The token is returned in an `HttpOnly` cookie, never in the JSON body or localStorage.
- Cookie defaults: `HttpOnly`, `SameSite=Lax`, path `/api` so the same session reaches auth and resource APIs; `Secure` is enabled in production. For a cross-site frontend/API deployment, configure `AUTH_COOKIE_SAME_SITE=none`, which also forces `Secure`, and use HTTPS. State-changing auth routes reject a supplied `Origin` that differs from `CLIENT_URL`.
- Protected requests verify the signature/expiry, then reload the account from MongoDB. Authorization uses the current database role and account status, not the role claim in the JWT. Missing, deleted, or suspended accounts cannot use an otherwise valid token.
- `requireRole()` handles global roles such as `admin`; `requireProjectOwner` checks the current project owner reference for project-scoped operations and permits audited admin-level routes to opt into their documented override policy.
- Logout clears the browser cookie. Because access tokens are stateless and no token denylist/refresh-token store is part of this phase, a copied token remains valid until its 15-minute expiry. Do not add long-lived tokens without a revocation design.

## Endpoints

Base path: `/api/v1/auth`

| Method and path | Access | Request | Success |
|---|---|---|---|
| `POST /register` | Public, trusted origin | `{ "name": "Campus Student", "email": "student@campus.edu", "password": "12+ characters", "confirmPassword": "optional" }` | `201 { "data": { "user": { ... } } }`; creates student and sets access cookie |
| `POST /login` | Public, trusted origin | `{ "email": "student@campus.edu", "password": "..." }` | `200 { "data": { "user": { ... } } }`; sets access cookie |
| `POST /logout` | Public, trusted origin | No body | `200 { "data": { "message": "Logged out." } }`; expires access cookie |
| `GET /me` | Authenticated | Cookie automatically sent by browser; Bearer token accepted for non-browser clients | `200 { "data": { "user": { ... } } }` |

The public user object contains `id`, `name`, `email`, `role`, `bio`, `skills`, `profileImage`, `createdAt`, and `updatedAt`; it never includes `passwordHash` or the JWT.

### Error behavior

All errors use `{ "error": { "code": "...", "message": "...", "details": [] } }` where details apply.

- `400 VALIDATION_ERROR`: invalid name/email/password, unknown request fields, role injection, or mismatched confirmation.
- `401 INVALID_CREDENTIALS`: generic response for an unknown email or incorrect password.
- `401 AUTHENTICATION_REQUIRED` / `401 INVALID_TOKEN`: missing, malformed, or expired token.
- `401 ACCOUNT_UNAVAILABLE` / `403 ACCOUNT_UNAVAILABLE`: deleted/suspended account during token check or login.
- `403 UNTRUSTED_ORIGIN`: state-changing auth request supplies a disallowed origin.
- `409 EMAIL_ALREADY_REGISTERED`: normalized email already exists, including concurrent duplicate submissions.
- `503 AUTHENTICATION_NOT_CONFIGURED`: JWT signing secret is missing/too short in local development.
- `503 DATABASE_UNAVAILABLE`: database request cannot be served.

## Configuration

Copy `server/.env.example` to `server/.env`. Set `JWT_ACCESS_SECRET` to a randomly generated value of at least 32 characters and set `MONGODB_URI` to a reachable development database. Keep `.env` out of source control. `JWT_ACCESS_SECRET` is a backend secret and must never be exposed through a `VITE_*` variable.

For example, generate a local secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

## Tests

`npm test --prefix server` runs the model and HTTP integration suites. Authentication tests use `mongodb-memory-server`, create a temporary MongoDB instance, verify connection/persistence/unique indexes, and stop the instance afterward. The MongoDB binary is downloaded on first test run if not already cached. These tests do not connect to or alter a developer's Atlas database.