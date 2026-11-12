# DevPress

DevPress is a publication-based publishing platform for developers, built on the MERN stack (MongoDB, Express, React, Node.js). A writer creates an account, creates one or more **publications** (each with its own name, address, look and public website), and writes Markdown articles inside them. Readers discover publications and articles, browse topics, and read articles with syntax-highlighted code.

It is an independent individual project inspired by Hashnode and is not affiliated with Hashnode.

## Concept

```
User  ->  Publications  ->  Articles
```

- **Users** own publications. One account can run several.
- **Publications** have a public website at `/p/<address>`, a creator workspace at `/publications/<address>/dashboard`, appearance settings and optional custom domains.
- **Articles** always belong to exactly one publication. Drafts are private; published articles appear on that publication's website, in Explore and under their topics.

## Features

- **Platform:** landing page with real publications and topics, Explore (all publications and the latest articles, title search), topic pages, About, Privacy Policy and Terms.
- **Accounts:** register, log in, log out; passwords hashed with bcrypt; JWT sessions that survive a refresh and end cleanly when the token expires. After logging in, creators land on My publications.
- **Publications:** creation with a live preview and an address availability check; workspace with Overview (real counts and recent articles), Articles and Drafts (publish, unpublish, edit, delete with confirmation), Write, Appearance (curated accent colour, typography and layout with live preview), Domain and Settings. Analytics is shown as planned: no reader data is collected.
- **Editor:** Markdown with a formatting toolbar and keyboard shortcuts, live preview (side by side on wide screens), tags, cover image URL, save draft, publish, update, unpublish, delete, a warning before leaving with unsaved changes, and a local backup of unsaved text.
- **Publication websites:** an editorial design (separate from the platform's dark interface) with a homepage, topic filter, article pages and an About page, using the publication's own accent colour, typography and layout.
- **Domains:** each publication works at its `/p/<address>` path today. Custom domains are verified with a DNS TXT record checked by a real DNS lookup. Subdomain and custom-domain serving needs a configured platform domain and hosting (see below).
- **Security:** the server checks ownership for every publication and article change; drafts are never returned by public routes; Markdown is rendered without raw HTML and with unsafe link protocols removed.

## Tech stack

| Part | Technology |
|---|---|
| Client | React 19, Vite, React Router (data router), Axios, react-markdown, react-syntax-highlighter, plain CSS with design tokens, self-hosted Geist, Geist Mono, Newsreader and Public Sans fonts (SIL OFL) |
| Server | Node.js, Express 5, Mongoose, jsonwebtoken, bcryptjs, cors, dotenv |
| Database | MongoDB (MongoDB Atlas) |
| Tests | Vitest, jsdom and React Testing Library (client) |

## Project structure

```
client/
  src/api/                Axios instance, token storage, 401 handling
  src/components/layout/  platform shell: top bar, mobile menu, footer, protected routes
  src/components/workspace/  publication workspace layout and navigation
  src/components/publication/ publication website frame, previews, appearance and identity fields
  src/components/editor/  Markdown editor and tag input
  src/components/post/    article cards, safe Markdown renderer, delete dialog
  src/context/            AuthContext (logged-in user and session status)
  src/pages/              platform pages; pages/workspace/ and pages/pub/ for the two other experiences
  src/styles/             tokens.css (platform), publication.css (publication websites), component styles
  src/utils/              validation, publication helpers, Markdown formatting, safe redirects
server/
  config/                 MongoDB connection
  controllers/            auth, posts, tags, users, publications, domains
  middleware/             JWT protection, error handling
  models/                 User, Post, Tag, Publication, Domain
  routes/                 /api/auth, /api/posts, /api/tags, /api/users, /api/publications
  utils/                  slugs, excerpts, tags, publication rules, validation helpers
```

## Requirements

- Node.js 22 or later (developed with Node.js 24) and npm
- A MongoDB database: a free MongoDB Atlas cluster, or MongoDB installed locally

## Setup

### 1. Install dependencies

```bash
cd server && npm install
```

```bash
cd client && npm install
```

### 2. Configure the server

Copy `server/.env.example` to `server/.env` and fill in the values:

| Variable | Meaning |
|---|---|
| `PORT` | Port for the API (default `5001`) |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_URL` | The address of the client, allowed by CORS (`http://localhost:5173` in development) |
| `MONGO_URI` | Your MongoDB connection string, with the database name before the `?` |
| `JWT_SECRET` | A long random secret for signing tokens |
| `JWT_EXPIRES_IN` | How long a login lasts, for example `7d` |
| `PLATFORM_DOMAIN` | Optional. The domain publication subdomains live under (for example `devpress.example` gives `<address>.devpress.example`). Leave empty until a real domain with wildcard DNS exists. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Configure the client

Copy `client/.env.example` to `client/.env`:

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Base URL of the API including `/api`, for example `http://localhost:5001/api` |
| `VITE_PLATFORM_DOMAIN` | Optional. Must match the server's `PLATFORM_DOMAIN`. When set, a request for `<address>.<domain>` or a verified custom domain shows that publication's website at the root of the host. When empty, publications are served only at `/p/<address>`. |

Everything starting with `VITE_` is bundled into public JavaScript, so never put secrets in the client `.env`.

### 4. Run

Start the API (restarts automatically on changes):

```bash
cd server && npm run dev
```

Start the client in a second terminal:

```bash
cd client && npm run dev
```

Open http://localhost:5173. The API health check is at http://localhost:5001/api/health.

## Tests

```bash
cd client && npm test
```

Runs the client test suite (Vitest). The tests use a fake API address and an in-process fake server, so they never contact a real server or database. The backend was tested during development with separate scripts against a dedicated scratch database; those scripts are not part of this repository.

## Production build

```bash
cd client && npm run build
```

The static site is written to `client/dist`. Start the API in production with `npm start` inside `server/` (set `NODE_ENV=production`).

## Deployment notes

- **API (for example Render or Railway):** root directory `server`, build command `npm install`, start command `npm start`. Set every variable from the server table; `CLIENT_URL` must be the deployed client address.
- **Client (for example Vercel or Netlify):** root directory `client`, build command `npm run build`, output directory `dist`. Set `VITE_API_URL` to the deployed API address plus `/api`.
- **Single-page routing:** the host must serve `index.html` for every path (for example `/p/my-publication/my-article`), otherwise refreshing a page returns 404. Configure a rewrite of all routes to `/index.html`.
- **Subdomains and custom domains** additionally need: a wildcard DNS record (`*.<PLATFORM_DOMAIN>`) pointing to the client host, the host configured to accept those names, and, for each custom domain, the owner's DNS pointing the domain to the client host after its TXT record has been verified in the Domain page. None of this is active until it is configured.

## API overview

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Public |
| GET | `/api/auth/me` | Logged in |
| GET | `/api/publications` | Public (all publications, public fields) |
| GET | `/api/publications/check-slug?slug=` | Public |
| GET | `/api/publications/mine` | Logged in |
| POST | `/api/publications` | Logged in |
| GET | `/api/publications/:slug`, `/api/publications/:slug/posts`, `/api/publications/:slug/posts/:postSlug` | Public (published articles of that publication only) |
| GET | `/api/publications/:slug/manage`, `/api/publications/:slug/manage/posts` | Owner |
| PUT | `/api/publications/:slug` | Owner (address cannot change) |
| GET, POST | `/api/publications/:slug/domains` | Owner |
| POST, DELETE | `/api/publications/:slug/domains/:domainId/verify`, `/api/publications/:slug/domains/:domainId` | Owner |
| GET | `/api/publications/resolve-host?host=` | Public (verified domains only) |
| GET | `/api/posts?search=&tag=` | Public (published only) |
| GET | `/api/posts/:slug` | Public (published only) |
| GET | `/api/posts/mine` | Logged in (own posts, drafts included) |
| GET | `/api/posts/id/:id` | Owner (for the editor) |
| POST | `/api/posts` | Logged in; `publication` must be one of your publications |
| PUT, DELETE | `/api/posts/:id` | Owner (an article cannot move to another publication) |
| GET | `/api/tags`, `/api/tags/:slug/posts` | Public |
| GET | `/api/users/:id` | Public (published posts and publications only, no email) |
| PUT | `/api/users/me` | Logged in |
