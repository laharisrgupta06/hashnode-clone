# DevPress: Product Requirements

Status as of 12 November 2026. Status labels: **Done** (implemented and verified), **Partial**, **Planned**.

## 1. Problem statement

Developers who want to publish technical writing usually choose between a shared feed, where articles compete with everyone else's and have no identity of their own, and a self-built blog that takes time to design, host and maintain. Code, the most important part of technical writing, is often poorly presented.

DevPress lets a developer run a **publication**, a blog with its own name, permanent address, appearance and website, without building or hosting a website, and write articles with first-class code support.

## 2. Target users

| User | Needs |
|---|---|
| **Writer** (developer who publishes) | A place of their own; an editor that handles Markdown and code well; private drafts; control over how the publication looks |
| **Reader** | Readable articles with highlighted code; a way to find more writing on a topic or by the same publication |
| **Publication owner with several blogs** | Separate publications (for example a personal blog and a project log) under one account |

## 3. Goals

1. Separate the **platform** (accounts and discovery), the **workspace** (writing and managing) and the **publication website** (reading).
2. Make writing pleasant: a clean document editor, a distinctive typewriter mode, and formatting without HTML knowledge.
3. Keep content portable: articles are stored as Markdown.
4. Enforce data ownership on the server; never show drafts publicly.
5. Be accessible and responsive from phone to desktop.

Non-goals for this stage: comments, likes and follows, monetisation, analytics, team collaboration.

## 4. Core concepts

```
User  ──owns──▶  Publication  ──contains──▶  Article (post)  ──tagged with──▶  Topic (tag)
```

- A **user** can own several publications.
- A **publication** has a unique, permanent address (`/p/<address>`), identity fields, appearance settings and optional custom domains.
- An **article** belongs to exactly one publication and is either a **draft** (private) or **published** (public).
- **Topics** (tags) are shared across the platform.

## 5. Requirements and status

### 5.1 Accounts

| ID | Requirement | Status |
|---|---|---|
| A1 | Register with name, email, password (min. 6 characters); email validated and unique | Done |
| A2 | Log in, log out; session persists across refresh, tabs and browser restarts until expiry | Done |
| A3 | Expired or invalid sessions end cleanly with a message | Done |
| A4 | Forgotten password by emailed, single-use, expiring link | Done (real email needs SMTP configuration) |
| A5 | Profile: display name, bio, avatar (URL) and public profile page | Done |
| A6 | Avatar upload from device | Planned (Cloudinary) |

### 5.2 Publications

| ID | Requirement | Status |
|---|---|---|
| P1 | Create a publication: name, address with availability check, tagline, description, logo URL, cover URL, appearance, live preview | Done |
| P2 | Address is permanent after creation | Done |
| P3 | My publications list with counts | Done |
| P4 | Workspace: Overview, Articles, Drafts, Write, Appearance, Domain, Settings | Done |
| P5 | Appearance: accent colour (5), typography (2), homepage layout (2) | Done |
| P6 | Custom domain with DNS TXT verification | Partial (verification works; serving needs deployment) |
| P7 | Subdomain hosting | Partial (routing code exists; needs deployment and DNS) |
| P8 | Analytics | Planned (shown as Planned in the workspace) |
| P9 | Themes, background/text colours, header/footer options, navigation links, custom pages, desktop/mobile preview | Planned |
| P10 | Logo and cover upload from device | Planned (Cloudinary) |
| P11 | Team members and roles | Planned (model field reserved, no API or UI) |

### 5.3 Writing

| ID | Requirement | Status |
|---|---|---|
| W1 | Title, Markdown content, tags (max 10), cover image URL | Done |
| W2 | Views of the same article: Typewriter, Document, Preview, Side by side | Done |
| W3 | Typewriter: real key and carriage animation, paper feed, page ejection to a stack, review mode; instant large pastes | Done |
| W4 | Formatting toolbar with headings, emphasis, underline, strikethrough, font, size, colour, highlight, lists, indent, quote, separator, alignment, links, code, code blocks with language, images by URL; active states; keyboard shortcuts | Done |
| W5 | Formatting survives every view, saving, reopening and publishing; no unsafe HTML | Done |
| W6 | Save draft, publish, update, unpublish, delete with confirmation | Done |
| W7 | Unsaved-change warning and local recovery | Done |
| W8 | Image upload from device (cover and in-article) | Planned (Cloudinary) |
| W9 | Full-width editor layout and collapsible workspace sidebar | Planned |

### 5.4 Reading and discovery

| ID | Requirement | Status |
|---|---|---|
| R1 | Publication website: homepage with topic filter, article page, About page, publication appearance | Done |
| R2 | Highlighted code (18 languages) with Copy button | Done |
| R3 | Landing page, Explore (publications, latest articles, title search), Topics, public profiles | Done |
| R4 | Privacy Policy, Terms, About | Done |

### 5.5 Quality

| ID | Requirement | Status |
|---|---|---|
| Q1 | Responsive from 320 px to desktop without horizontal scrolling | Done (checked at 320, 375, 768, 1024, 1280, 1440 px) |
| Q2 | Colour contrast at least 4.5:1 for text, checked by tests | Done |
| Q3 | Keyboard accessible with visible focus | Done |
| Q4 | Respects reduced motion; content never hidden by animation | Done |
| Q5 | Server-side ownership checks for all writes | Done |

## 6. Out of scope (current stage)

Comments, reactions, following, newsletters, paid content, analytics, multi-author publications, deployment.

## 7. Open questions

- Hosting target and deployment timing (see [DECISIONS.md](DECISIONS.md)).
- Whether the backend test scripts should be added to the repository (see [TEST_PLAN.md](TEST_PLAN.md)).
