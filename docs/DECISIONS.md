# DevPress: Technical Decisions

Significant decisions, why they were made, and their consequences. Status: **Accepted** (in place), **Accepted, not implemented**, or **Needs confirmation**.

---

### D1. MERN stack in JavaScript, plain CSS
**Status:** Accepted

- **Decision:** React (Vite) + Express + MongoDB on Node.js, written in JavaScript with ES modules; styling in plain CSS with design tokens. No TypeScript, no CSS framework.
- **Why:** one language across client and server, a widely used stack suited to an individual project, and full control over the visual design without framework conventions.
- **Consequences:** consistency comes from conventions and tests rather than types; design consistency comes from `tokens.css` and its contrast tests.

### D2. MongoDB with Mongoose
**Status:** Accepted

- **Decision:** MongoDB (Atlas during development) accessed through Mongoose schemas.
- **Why:** articles, publications and their appearance settings map naturally to documents; Atlas offers a free hosted cluster; Mongoose adds schemas, validation and indexes.
- **Consequences:** any MongoDB connection string works (Atlas or local). Relationships (owner, author, publication, tags) are references resolved with `populate`.

### D3. JWT bearer tokens and bcrypt
**Status:** Accepted

- **Decision:** stateless JWT (HS256) sent as a Bearer header and stored in `localStorage`; passwords hashed with bcrypt.
- **Why:** simple to implement and to test, works across tabs and browser restarts, no server-side session store.
- **Trade-offs:** tokens cannot be revoked before expiry, and `localStorage` is readable by page scripts. Mitigated by never rendering user HTML; revocation is listed as a future improvement ([SECURITY.md](SECURITY.md#known-limitations)).

### D4. Publication-based architecture
**Status:** Accepted

- **Decision:** User → Publication → Article. Every article belongs to exactly one publication owned by its author. Three separate experiences: platform, workspace (`/publications/<address>/…`) and publication website (`/p/<address>`).
- **Why:** it gives each writer a blog of their own instead of a single shared feed, and separates managing from reading.
- **Consequences:** ownership is checked through the publication; publication addresses and article slugs are permanent so links never break; a publication website has its own frame and appearance.

### D5. Custom domains verified by DNS TXT, serving deferred
**Status:** Accepted (verification); serving needs deployment

- **Decision:** owners prove a domain with a TXT record `_devpress.<domain>` = `devpress-verify=<token>`, checked with a real DNS lookup. Subdomain and custom-host routing exists in the client (`hostMode`) but is only active with a platform domain and hosting.
- **Why:** the standard, provider-independent ownership proof; serving requires infrastructure not available locally.

### D6. Visual identity: beige and charcoal, editorial
**Status:** Accepted

- **Decision:** an editorial design with warm beige grounds, charcoal text and a bronze accent; Newsreader for display, Geist for interface, Geist Mono for code; fonts self-hosted. Publication websites use a lighter ivory sheet with an owner-chosen accent.
- **Why:** a calm, readable identity that suits long-form technical writing and stands apart from generic dashboard styles.
- **Consequences:** all colours are tokens with automated contrast tests; the bronze `#a78355` is decoration only because it fails text contrast on beige.

### D7. Markdown storage with safe formatting extensions
**Status:** Accepted

- **Decision:** article content is stored as Markdown. Formatting Markdown cannot express (underline, highlight, colour, font, size, alignment) uses a small allowlist of exact tags defined in `client/src/utils/richFormat.js`.
- **Implementation choice:** the allowlist is enforced by a custom remark plugin (`remarkDevpressFormat`) that matches whole tag strings and turns everything else into text, instead of parsing HTML and sanitising it afterwards. This needs no HTML parser and only one new package (`remark-gfm`, for strikethrough and tables).
- **Why:** Markdown keeps content portable and readable; parsing no HTML at all removes a whole class of injection risks.
- **Consequences:** colours, fonts and sizes come from curated, contrast-checked lists; paragraph indentation is not supported (Markdown has none), only list nesting.

### D8. The typewriter is a view, not a second editor
**Status:** Accepted

- **Decision:** the typewriter edits the same Markdown state as the Document view, through a real transparent text area. Pages, carriage position and the stack are computed from the content by a pure function (`paginate`), and animated with the Web Animations API.
- **Why:** saving, publishing, recovery and validation stay in one place; the animation can never change or delay the content; large pastes are accepted instantly.
- **Assets:** three images (body, carriage, paper) were cut out from the project owner's reference images: the black backgrounds were removed into real transparency. A DevPress nameplate covers the maker's badge on the body.
- **Consequences:** the typewriter is protected ([RULES.md](RULES.md#6-the-typewriter-is-protected)). It opens by default on screens of 640 px and wider; phones open the Document view, where text is readable. The chosen view is remembered per device.

### D9. Password reset by SMTP email (Nodemailer)
**Status:** Accepted

- **Decision:** reset links are emailed through any SMTP provider configured in `server/.env`, sent with Nodemailer. Tokens are random, stored hashed, single use and valid for 30 minutes.
- **Why:** SMTP works with common providers (including Gmail App Passwords) without tying DevPress to one vendor; credentials stay on the server.
- **Consequences:** development without SMTP prints the link in the backend terminal; production without SMTP refuses reset requests openly rather than pretending to send.

### D10. Image storage: Cloudinary
**Status:** Accepted, **not implemented**

- **Decision:** device uploads for avatars, publication logos and covers, article covers and in-article images will be stored on Cloudinary through a server-side storage service, keeping credentials on the server; MongoDB will store only image URLs and metadata.
- **Why:** images must survive restarts and redeployments, which server disk does not guarantee on most hosts; no binary data in MongoDB.
- **Current state:** every image field accepts a URL. Implementation is scheduled after the first mentor review and needs `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (and optionally `CLOUDINARY_FOLDER`) in `server/.env`.

### D11. Testing strategy and the scratch-database rule
**Status:** Accepted

- **Decision:** client tests with Vitest and React Testing Library through a fake Axios adapter; API tests as end-to-end scripts against a running API connected to a dedicated scratch database, with a preflight check that refuses to run otherwise.
- **Why:** an early test run reached a development server that was connected to the real database. Since then, API tests run on a separate port against a scratch database that is checked before every run and dropped afterwards.
- **Consequences:** the real database is never written by tests. The API scripts currently live outside the repository (see "Needs confirmation").

### D12. New-tab rules
**Status:** Accepted

- **Decision:** links from the workspace to the public website and articles, from My publications into a workspace, and from the Dashboard (`/dashboard`) to a publication's workspace, an article's editor or the public article, open in a new tab (`target="_blank"`, `rel="noopener noreferrer"`) and say so to screen readers. All other navigation stays in the same tab. The Dashboard refreshes its list when its tab becomes visible again.
- **Why:** writers keep their working tab while checking the public result, without repeated use of Back.

### D13. No analytics yet
**Status:** Accepted

- **Decision:** the Analytics section is shown as Planned; DevPress records no page views or reader data.
- **Why:** collecting reader data needs a clear purpose and an updated Privacy Policy first.

---

## Needs confirmation

- **Hosting and deployment:** provider and timing are not decided (the README lists the configuration a host needs).
- **Backend test scripts:** whether to add the API end-to-end scripts to the repository, and in what form.
- **Analytics scope:** what, if anything, should be measured once analytics are planned in detail.
