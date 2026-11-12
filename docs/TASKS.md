# DevPress: Task Tracker

Updated 12 November 2026. A task is marked complete only when it is implemented and has been verified (tests and/or browser checks). See [TEST_PLAN.md](TEST_PLAN.md) for how things were verified.

## Completed

### Backend
- [x] Express 5 server, MongoDB connection, health check, central error handling
- [x] Models: User, Post, Tag, Publication, Domain
- [x] Registration and login: bcrypt password hashing, JWT (HS256) sessions, `protect` middleware
- [x] Email format and length validation on registration
- [x] Articles API: create, read, update, delete, search by title, filter by tag; drafts never public
- [x] Tags API: topic list with counts, articles per topic; tags created on save
- [x] Users API: public profile with publications and articles, profile update
- [x] Publications API: create, read, update (address permanent), owner-only management routes, address availability check
- [x] Ownership enforcement: every article belongs to a publication the author owns; cross-account changes are refused (403)
- [x] Custom domain records with DNS TXT verification (real DNS lookup)
- [x] Password reset: hashed, single-use, 30-minute tokens; identical response for unknown emails; Nodemailer SMTP; development console fallback; clear refusal in production without SMTP
- [x] Excerpts strip Markdown and formatting tags (including nested lists)

### Frontend: platform and accounts
- [x] React 19 + Vite app, data router, Axios client with token and expired-session handling
- [x] Register, log in, log out, persistent sessions, protected routes with return to the requested page
- [x] Forgot-password and reset-password pages
- [x] Landing page with animated SVG typewriter illustration, Explore with title search, Topics, topic pages, public profiles, profile settings, About, Privacy, Terms, 404 and error pages

### Frontend: publications
- [x] Create publication with live preview and address availability check
- [x] My publications; workspaces open in a new tab
- [x] Consolidated dashboard (`/dashboard`): every article across all my publications, with status, publication date and quick actions
- [x] Publication date (`publishedAt`): set on publishing, kept on edits, cleared on unpublishing; public lists ordered by it (legacy articles fall back to their creation date)
- [x] Workspace: Overview, Articles, Drafts, Write, Appearance, Domain, Settings; Analytics labelled Planned
- [x] Appearance: 5 accent colours, 2 typography presets, 2 homepage layouts, live preview
- [x] Publication websites: homepage with topic filter, article pages, About page, publication appearance
- [x] Workspace links to the public website open in a new tab

### Frontend: writing
- [x] Article editor: title, tags, cover URL, save draft, publish, update, unpublish, delete with confirmation
- [x] Unsaved-change warning and local backup recovery
- [x] Markdown rendering with syntax highlighting (18 languages) and Copy button; GFM tables and strikethrough
- [x] Interactive typewriter view: keys, carriage, paper feed, page ejection, stack, review mode, instant large pastes, reduced-motion and background-tab handling
- [x] Typewriter scene proportions: a whole page stays visible above the platen
- [x] Document view that grows with the article
- [x] Grouped formatting toolbar with active states: headings, bold, italic, underline, strikethrough, font, size, colour, highlight, clear, lists, indent, quote, separator, alignment, links (edit and remove), inline code, code block with language, image by URL
- [x] Safe formatting extensions (exact allowlist, no HTML parsing) with round-trip and security tests

### Design and quality
- [x] Beige and charcoal design system with tokens; self-hosted fonts
- [x] Colour-contrast tests for every token pair in use
- [x] Responsive layout checked from 320 px to 1440 px; keyboard and focus checks; reduced motion
- [x] Client test suite (Vitest + React Testing Library)

### Documentation
- [x] README and documentation set in `docs/`

## In progress

- [ ] Mentor review of the current version on GitHub
- [ ] Commit and push of the work completed since the last commit (awaiting approval)

## Pending

- [ ] **Image uploads with Cloudinary**: avatar, publication logo and cover, article cover, images inside articles; device upload and URL options, preview, replace, remove, validation, progress. Decided (see [DECISIONS.md](DECISIONS.md)); waiting for the mentor review and the Cloudinary account configuration.
- [ ] **Editor layout:** use the full browser width; tidy article metadata; a more compact toolbar on phones
- [ ] **Workspace:** collapsible sidebar with remembered preference; simpler publication identity (less repetition of initials, name and address); cleaner Overview
- [ ] **Publication customisation:** themes, background and text colours, heading and body fonts, article card styles, homepage arrangements, header and footer options, navigation links, custom pages (About, Projects, Contact), desktop and mobile preview, reset to default
- [ ] Add the backend end-to-end test scripts to the repository (they currently live outside it)
- [ ] Full end-to-end user acceptance test after the pending features
- [ ] Deployment (hosting provider still to be decided)

## Future enhancements

- [ ] Analytics (no reader data is collected today; the Privacy Policy must be updated first)
- [ ] Team members and roles for a publication (the data model reserves a field)
- [ ] Serving publications on subdomains and verified custom domains (needs deployment and DNS)
- [ ] Security hardening listed in [SECURITY.md](SECURITY.md#known-limitations): rate limiting, signing out other sessions after a password reset, server-side session revocation
