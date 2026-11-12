# DevPress: Test Plan

How DevPress is tested, what the tests cover, the latest verified results, and a manual acceptance checklist.

## 1. Approach

| Level | Tooling | Where |
|---|---|---|
| Unit tests (pure logic) | Vitest | `client/src/**/*.test.js` |
| Component tests | Vitest, React Testing Library, jsdom, fake API adapter | `client/src/**/*.test.jsx` |
| API end-to-end tests | Node scripts against a running API and a scratch database | outside the repository (see 3) |
| Browser verification | Real Chrome (in-app browser and headless Chrome driven through the DevTools protocol) | during development |
| Manual acceptance | The checklist in section 5 | anyone |

Two rules apply to every level:

1. **Never test against the real database.** Backend and browser tests use a separate scratch database; a preflight check proves the API is connected to it before any test writes.
2. **Report what actually ran.** Results below are from real runs, with dates.

## 2. Frontend tests (in the repository)

```bash
cd client
npm test              # all tests once
npm run test:watch    # watch mode
```

The tests never contact a server: `client/src/test/fakeServer.js` replaces Axios's network adapter, so the real interceptors still run.

| Area | Test files | What is checked |
|---|---|---|
| API client and session | `api/axios.test.js`, `context/AuthContext.test.jsx` | Token header, 401 handling, session restore, login/logout |
| Routing and layout | `components/layout/*.test.jsx`, `utils/safeRedirect.test.js`, `utils/lazyWithReload.test.jsx` | Protected routes, safe redirects, shell, chunk-reload behaviour |
| Forms | `components/common/AuthForm.test.jsx`, `utils/validation.test.js`, `pages/PasswordReset.test.jsx` | Validation, focus on errors, forgot/reset password pages, error messages |
| Editor | `components/editor/MarkdownEditor.test.jsx`, `TagInput.test.jsx`, `utils/markdownFormat.test.js`, `utils/richFormatActions.test.js` | Every toolbar action, active states, apply/remove round trips, shortcuts, image form |
| Rendering and security | `components/post/MarkdownRenderer.test.jsx`, `components/post/richFormat.test.jsx` | Markdown features, code blocks, the formatting allowlist, 11 attack strings shown as text |
| Typewriter | `utils/typewriterPages.test.js`, `components/editor/typewriter/TypewriterDesk.test.jsx` | Pagination never changes the Markdown (500-line paste), code blocks across pages, typing into real state, reduced motion, background tabs, review |
| Publications | `utils/publication.test.js`, `components/publication/SiteLink.test.jsx` | Address helpers, host routing, accent contrast, new-tab links |
| Design | `styles/tokens.test.js` | WCAG contrast of every token pair in use, including the formatting palette |
| Misc | `components/common/PageMeta.test.jsx`, `utils/apiError.test.js` | Page titles, error mapping |

**Latest run (12 November 2026): 23 test files, 428 tests, all passing.** The production build (`npm run build`) also succeeded.

## 3. Backend tests (outside the repository)

The API was tested with six end-to-end scripts that call every endpoint over HTTP: registration and login, email validation, articles, tags, users and publications (including ownership checks and cross-account attempts). They are run against a local API started with the scratch database, after a preflight that registers a sentinel account and confirms it appears in the scratch database.

| Suite | Checks | Last result |
|---|---|---|
| Authentication | 45 | pass |
| Email validation | 32 | pass |
| Articles | 97 | pass |
| Tags | 94 | pass |
| Users | 97 | pass |
| Publications | 71 | pass |
| **Total** | **436** | **all passing (12 November 2026)** |

**Password reset** was verified with a separate script (39 checks, all passing on 12 November 2026) in four server modes: development without SMTP (link in the terminal), development with SMTP, production without SMTP (clear refusal) and production with SMTP. Real emails were delivered to a local test mail server. The checks cover the neutral response for unknown emails, similar response times, hashed storage, 30-minute expiry, single use, replacement by a newer link, password rules, and that tokens never appear in responses or production logs.

These scripts are not yet part of the repository (see [TASKS.md](TASKS.md)), so these results cannot be reproduced from a clone today.

## 4. Browser verification

Performed in real Chrome during development, against the scratch database:

- **Author workflow:** register, create a publication, write in the typewriter, switch views, paste a 34,896-character document with JavaScript, Python and Go code, save, reload and restore unsaved changes, publish, open the public article (code highlighted, tabs kept), update, delete. Saved and published content was compared byte for byte with the editor.
- **Typewriter:** the right key cap moves for each typed character; the carriage steps and returns; the paper rises; a full page ejects and lands on the stack; the first and last lines of a nearly full page are visible together at 90%, 100%, 110%, 125% and 150% browser zoom.
- **Formatting:** an article built with the toolbar keeps identical Markdown through Typewriter, Document, Preview, Side by side, saving, reopening and publishing; the published page shows the real colours, fonts and alignment; the toolbar follows the caret with real key presses.
- **Responsive:** no horizontal scrolling at 320, 375, 768, 1024, 1280 and 1440 px; phones open the editor in Document view.
- **Navigation:** workspace-to-website links and My publications-to-workspace links open new tabs (the original tab stays); links inside a publication website stay in the same tab; 41 internal links crawled with none broken.
- **Sessions:** survive refresh, a new tab and closing and reopening the browser; logout ends the session; an expired token (6-second test expiry) returns the user to Log in with a message.
- **Accessibility and motion:** every tab stop shows a focus indicator; `prefers-reduced-motion` stops all animation with content fully visible; content stays visible with animations frozen and in background tabs.
- **Assets:** typewriter images verified to have real transparency (no black matte or dark fringe); no failed requests or console errors on the checked pages.

## 5. Manual acceptance checklist

Use a fresh account on your own database. Tick each item.

**Accounts**
- [ ] Register; you land on My publications
- [ ] Log out and log in again; refresh the page and stay logged in
- [ ] Forgot password: request a link, open it from the backend terminal, set a new password, log in with it
- [ ] A second account cannot open the first account's workspace or editor

**Publications**
- [ ] Create a publication; the address check reports availability; the preview follows your edits
- [ ] Change the appearance, save, and see it on the public website
- [ ] Workspace links to the website open in a new tab

**Writing**
- [ ] Type in Typewriter view: keys move, the carriage moves and returns, the paper rises
- [ ] Paste several pages: they are accepted at once and pages fly to the stack; clicking the stack opens Document view
- [ ] Use each toolbar group in Document view; Preview shows the formatting; switching views keeps the text identical
- [ ] Save a draft; reload with unsaved changes and restore them
- [ ] Publish; open the article on the website; code is highlighted and has a Copy button
- [ ] Update and unpublish; delete with confirmation

**Reading**
- [ ] Explore lists the publication and article; search finds the article by title
- [ ] Topics and the topic page list the article
- [ ] The public profile shows the publication and article

**Quality**
- [ ] Narrow the browser to phone width: no sideways scrolling; menus work
- [ ] Use the keyboard only: focus is always visible
