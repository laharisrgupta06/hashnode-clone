# DevPress: Security

How DevPress protects accounts and data, and what is still missing. No secrets appear in this repository; configuration values are placeholders.

## Passwords

- Hashed with **bcrypt** (bcryptjs, cost factor 10) before storage. The plain password is never stored or logged.
- The password field is excluded from every query by default (`select: false`) and is only loaded by login and password reset.
- Minimum length is 6 characters, checked on the server (and in the browser for feedback).
- Login answers **"Invalid email or password"** both for unknown emails and wrong passwords, so it does not reveal which emails are registered. Server and network failures get their own messages.

## Sessions

- After login or registration the API returns a **JWT** signed with `JWT_SECRET` (HS256) containing only the user id, valid for `JWT_EXPIRES_IN` (for example `7d`).
- The client stores the token in `localStorage` (key `hashnode_token`, in memory if storage is blocked) and sends it as `Authorization: Bearer <token>`.
- The `protect` middleware verifies the signature, pins the algorithm to HS256, checks expiry, and loads the user again, so a deleted account cannot keep using an old token.
- Any 401 on an authenticated request clears the token in the browser and shows "Your session has expired".
- Logging out removes the token from the browser.

## Password reset

1. `POST /api/auth/forgot-password` returns the same message for every email and responds before any work is done, so neither content nor timing reveals whether an account exists.
2. For an existing account, the server creates 32 random bytes, stores only their **SHA-256 hash** with a **30-minute expiry**, and emails the link `<CLIENT_URL>/reset-password#token=<token>`. Only one request per account per minute creates a new token; a newer link replaces the older one.
3. The token is in the URL **fragment** (`#…`), which browsers never send to servers, so it cannot appear in web-server logs. The reset page reads it once and removes it from the address bar.
4. `POST /api/auth/reset-password` hashes the submitted token, checks it has not expired, sets the new bcrypt hash and deletes the token (**single use**).
5. Without SMTP settings: in development the link is printed in the backend terminal; in **production the request is refused** with a plain message and nothing is created or logged.

Email configuration (`server/.env` only): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. For Gmail, turn on 2-Step Verification, create an App Password (Google Account → Security → App passwords) and use `smtp.gmail.com`, port `465`, `SMTP_SECURE=true`, your address and the 16-character app password. Other providers usually use port `587` with `SMTP_SECURE=false`.

## Authorisation and data ownership

- Workspace, editor and settings routes require login (`protect` on the API, `ProtectedRoute` in the client).
- **Ownership is checked on the server** for every change: a publication can only be changed by its owner; an article can only be created in a publication the author owns and changed by its author. Attempts on someone else's data return 403. Ids sent by the client are never trusted.
- Controllers copy only allowed fields from the request body, so `owner`, `author`, `slug` or `_id` cannot be set by a client.
- **Drafts are private:** public routes only return published articles; a draft answers 404 to anyone else.
- Request values are type-checked before use, which blocks MongoDB operator injection such as `{"$gt": ""}`.

## Content safety

- Articles are Markdown. **Raw HTML is never rendered.** The only tags that become elements are an exact allowlist for underline, highlight, colour, font, size and alignment, matched as whole strings without an HTML parser; anything else is shown as text (tested with script, event-handler, style, iframe and `javascript:` inputs).
- Link addresses with unsafe protocols (such as `javascript:`) are removed by react-markdown's URL filter.
- External links open with `rel="noopener noreferrer nofollow ugc"`; images load with `referrerPolicy="no-referrer"`.
- Redirects after login only go to paths inside DevPress (`safeRedirect`).

## Transport and server configuration

- CORS allows browser requests only from `CLIENT_URL`.
- JSON bodies use Express's default size limit (100 KB).
- Error responses contain a safe message; stack traces are included only when `NODE_ENV` is not `production`.
- Custom-domain ownership is proven with a random token published as a DNS TXT record (`_devpress.<domain>`), checked by a real DNS lookup.

## Secrets and environment variables

| Where | What | Rule |
|---|---|---|
| `server/.env` | `MONGO_URI`, `JWT_SECRET`, `SMTP_*` and other server settings | Never committed (`.gitignore`); use a long random `JWT_SECRET` |
| `client/.env` | `VITE_API_URL`, `VITE_PLATFORM_DOMAIN` | Bundled into public JavaScript: **never put secrets here** |
| `*.env.example` | Variable names with placeholder values | Committed, contains no real values |

The server never prints the database connection string, passwords, tokens or (in production) reset links.

## Database security

- Use a dedicated database user with a strong password; on MongoDB Atlas restrict **Network Access** to the addresses that need it.
- Tests must never run against the real database; use a scratch database with a preflight check (see [TEST_PLAN.md](TEST_PLAN.md)).

## Dependency audit (12 November 2026)

- `client`: `npm audit` reports **0 vulnerabilities**.
- `server`: **2 moderate** advisories in `minimatch`, pulled in by the development-only tool `nodemon`; not used by the running API. The suggested fix requires a breaking `--force` update and has not been applied.

## Known limitations

- **No rate limiting** on login, registration or password-reset requests (only the one-reset-per-minute rule per account).
- **No server-side session revocation:** logout clears the browser only; a copied token stays valid until it expires, and a password reset does not sign out other devices.
- **Token in `localStorage`:** readable by JavaScript on the page if a cross-site scripting bug were ever introduced; mitigated by never rendering user HTML.
- **No email verification** at registration.
- **No security headers middleware** (such as a Content Security Policy); these should be added at deployment.
