# Campus Issue Tracker

MERN application scaffold for the Campus Open-Source Contribution & Issue Tracker. It includes a Vite/React client, modular Express API, MongoDB/Mongoose models, health endpoints, and student authentication. Project, issue, and contribution workflows remain for later phases.

## Requirements

- Node.js 20.19+ or 22.12+ (Node.js 26 is also supported)
- npm
- MongoDB Community locally or a MongoDB Atlas connection string (optional for the initial health-check scaffold)

## Install

Open a terminal in each package directory and install its dependencies:

```powershell
cd server
npm install
Copy-Item .env.example .env
```

In a second terminal:

```powershell
cd client
npm install
Copy-Item .env.example .env
```

Edit `server/.env` to set `MONGODB_URI` and `JWT_ACCESS_SECRET` before using authentication. Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. The database URI may remain blank for local API-only development; `/api/v1/ready` returns `503` until MongoDB connects. Never commit `.env` files or put secrets in `client/.env`; Vite variables are public in the browser bundle.

## Run in development

Start the API in one terminal:

```powershell
cd server
npm run dev
```

Start the web client in another terminal:

```powershell
cd client
npm run dev
```

Open the Vite URL printed in the client terminal (normally `http://localhost:5173`). The status panel requests `GET http://localhost:5000/api/v1/health` through Axios. The health endpoint is a liveness check; readiness is reported separately by `/api/v1/ready`.

## Production builds

```powershell
cd client
npm run build
npm run preview
```

Production startup requires a MongoDB URI and a JWT secret. Configure production environment variables and a process manager/platform command before deployment.

## Current structure

- `client/`: React, Vite, React Router, Tailwind CSS, Axios, and the API status UI.
- `server/`: modular Express app, auth routes/services/controllers, JWT/cookie middleware, validation, centralized errors, health endpoints, and Mongoose connection setup.
- `docs/`: requirements, architecture, authentication and REST API references, database schema, roadmap, and UI design specification.
- `docs/AUTHENTICATION.md`: authentication endpoints and security behavior.
- `server/tests/`: model tests and auth endpoint integration tests using an ephemeral MongoDB.

See `docs/ARCHITECTURE.md` for the intended modular structure and follow the milestone gates in `docs/ROADMAP.md` before adding product modules. Run `npm test --prefix server`; the first run downloads a MongoDB test binary if one is not cached.