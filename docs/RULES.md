# DevPress: Development Rules

Practical rules for anyone changing DevPress. They describe how the project is already built; follow them so the codebase stays consistent.

## 1. General

- **Keep changes focused.** One change, one purpose. Do not mix refactors, restyling or dependency updates into a feature change.
- **Do not change the stack.** JavaScript (no TypeScript migration), plain CSS with design tokens (no CSS framework), React with React Router on the client, Express with Mongoose on the server.
- **No unnecessary dependencies.** Prefer the platform and existing code. A new package needs a clear reason (security, correctness or a large saving in code), must be well maintained, and is recorded in [DECISIONS.md](DECISIONS.md).
- **Do not remove working functionality** while changing something else.
- **No fake features.** A button or menu item must do what it says. Unfinished features are either absent or clearly labelled "Planned".

## 2. Project structure and naming

| Kind | Location | Naming |
|---|---|---|
| React components | `client/src/components/<area>/` | `PascalCase.jsx`, one main component per file |
| Pages | `client/src/pages/`, `pages/workspace/`, `pages/pub/` | `PascalCase.jsx` |
| Hooks | `client/src/hooks/` | `useSomething.js` |
| Pure helpers | `client/src/utils/` | `camelCase.js` |
| Styles | `client/src/styles/` | by layer: `tokens`, `base`, `layout`, `components`, `pages`, `platform`, `landing`, `typewriter`, `publication` |
| Tests | next to the code | `name.test.js` / `name.test.jsx` |
| Express routes | `server/routes/` | `<resource>Routes.js` |
| Controllers | `server/controllers/` | `<resource>Controller.js` |
| Models | `server/models/` | `PascalCase.js`, singular (`Post`, `Publication`) |
| Server helpers | `server/utils/` | `camelCase.js` |

- ES modules everywhere (`import` / `export`), on both client and server.
- Component areas: `common` (generic UI), `layout` (app frame), `workspace`, `publication`, `editor`, `post`, `landing`.
- Platform pages, workspace pages and publication-website pages stay separate; publication websites must not use the platform shell.

## 3. Frontend conventions

- **API calls only through `client/src/api/axios.js`** (it adds the token and handles expired sessions). Use `useRequest` for page data.
- **Auth state only through `useAuth()`** (`AuthContext`).
- **Styles use tokens.** Colours, fonts, spacing, radii and timings come from `tokens.css`. A new colour is added as a token, with contrast pairs in `tokens.test.js`.
- **Accessibility:** every control has a visible label or an accessible name; errors are linked to their field; focus stays visible; new motion respects `prefers-reduced-motion` and never hides content.
- **Page titles:** every page sets its title with `PageMeta`.
- **Copy:** plain, specific, British spelling; no em dashes in interface text.
- **Links that leave the workspace for the public website** (and from My publications into a workspace) use `SiteLink` (new tab). All other internal navigation stays in the same tab.

## 4. Backend and API conventions

- **Routes → controllers → models.** Routes only map URLs and add `protect`; controllers validate, check ownership and respond; models define data.
- **Validate everything in the controller.** Check types (`typeof … === 'string'`) before using request values; this also blocks MongoDB operator injection. The client's checks are only for user feedback.
- **Ownership on the server, always.** Load the publication or article and compare its `owner`/`author` with `req.user._id` before any change. Never trust ids from the client.
- **Drafts are private.** Public routes filter on `status: 'published'`.
- **Errors:** set the status (`res.status(400)` …) and `throw new Error('message')`; the error middleware answers `{ message }`. Messages are safe to show users and never contain secrets or internal details.
- **Responses** return only the fields the client needs (see `toUserResponse`, `PUBLIC_FIELDS`).
- **Permanent addresses:** a publication's address and an article's slug never change after creation.

## 5. Content and Markdown

- Article content is stored as **Markdown**. Do not add a second content format or store rendered HTML.
- Formatting that Markdown cannot express uses only the allowlisted tags in `client/src/utils/richFormat.js`, rendered by `remarkDevpressFormat`. **Never render arbitrary HTML** (no `rehype-raw`, no `dangerouslySetInnerHTML` for user content).
- A new formatting option must add: the allowlist entry, the toolbar action in `markdownFormat.js`, styles, and round-trip tests (apply → render → paginate → remove).
- Code blocks, syntax highlighting, headings, lists, links, quotes and images must keep working; the renderer tests cover them.

## 6. The typewriter is protected

The typewriter view is a signature feature. Do not redesign, replace or "simplify" it.

- **Do not modify** the image assets in `client/src/assets/typewriter/` (body, carriage, paper) or the key positions in `keyLayout.js`.
- **Do not change** key animations, carriage movement and return, paper feed, page ejection and flight, landing on the stack, review mode, or their timing, unless a real defect is found and documented.
- `utils/typewriterPages.js` (`paginate`) must never change the Markdown: `joinPages(paginate(x)) === x` is tested and must stay true.
- The typewriter edits the **same** article state as the other views. Do not give it its own copy of the content or its own save path.
- Layout changes around the editor are fine; if a change seems to require editing `TypewriterDesk.jsx`, explain why first.

## 7. Security

- Secrets live only in `server/.env` (git-ignored). Never commit `.env` files, tokens, passwords or connection strings. `client/.env` must contain no secrets (`VITE_` values are public).
- Never log passwords, tokens, reset links in production, or connection strings.
- Passwords: bcrypt only. Reset tokens: stored hashed, single use, expiring.
- See [SECURITY.md](SECURITY.md).

## 8. Testing requirements

- Run `npm test` in `client/` before committing; all tests must pass.
- New logic gets tests next to it: pure helpers with unit tests, components with React Testing Library through the fake API (`client/src/test/fakeServer.js`); tests never contact a real server or database.
- Run `npm run build` in `client/` for any change that affects the bundle.
- **Backend testing must never use the real database.** Use a separate scratch database and a preflight check that confirms the API is connected to it before any test writes. Do not create test accounts or data in the real database.
- Check UI changes in a real browser at phone, tablet and desktop widths, with reduced motion, and with the keyboard. See [TEST_PLAN.md](TEST_PLAN.md).

## 9. Git

- Work on a branch for anything non-trivial; keep `main` working.
- Commit messages: short, imperative, with a type prefix (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`), and a body for anything non-obvious.
- Commits are made under the contributor's own identity, with an email linked to their GitHub account.
- Do not rewrite or force-push shared history.
- Never commit `node_modules/`, `dist/`, `.env` files, logs or scratch files (see `.gitignore`).
- Review your diff before committing: no unrelated files, no debug code, no secrets.
