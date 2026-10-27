# SORYVYN

**A focused manga, manhwa, and manhua discovery and reading application.**

SORYVYN is being built as a desktop-first manga reader. The intended product includes a local library, manga-only source catalogue, unified search, chapter details, offline reading, progress, favorites, bookmarks, and backups; the live-source and download systems are still in development.

> **Repository status:** Web PWA Chunk 01 is implemented. Chunks 02–07 are not complete. Local image-folder import is a partial step toward Chunk 04; versioned JSON backup/restore is an early slice of Chunk 06. This README defines the product and engineering contract; see [the seven-chunk PWA roadmap](./WEB-PWA-ROADMAP.md) for delivery status.

## Web PWA status — Chunk 01

The current browser preview includes the responsive SORYVYN shell, monochrome interface, Discover catalogue using eight original fictional sample titles, Manga/Manhwa/Manhua filters, search and sorting, title details, a 3D open-book reader preview with two facing pages and interactive page-turning, browser-storage persistence for saved items/favorites/history/progress, validated local JSON backup export/import, folder-based local page import saved in IndexedDB, and an internal source-browser sandbox. The spread-bookmark UI is not active yet; saved page positions remain planned. The PWA manifest, SVG icon, service worker, and initial offline app-shell cache are included. A privacy page is available at [`privacy.html`](./privacy.html) and is linked from the app footer. A GitHub Actions workflow checks JavaScript syntax and core PWA/category-scope assumptions.

**Important:** sample sources are placeholders, not live services. The source browser intentionally stays inside SORYVYN and cannot browse arbitrary websites. Real source adapters and live chapter downloads are later chunks.

### Run the PWA locally

The web build has no package install or build step. From the repository root, run `python -m http.server 4173` and open `http://localhost:4173`. Keep the server running to test service-worker caching and installability. PWA behavior requires `localhost` or HTTPS; opening the file directly with `file://` does not provide the full PWA lifecycle. GitHub Pages deployment is wired through the repository workflow. The public URL is `https://tamasrazim.github.io/SORYVYN/` once the first deployment succeeds and GitHub Pages is enabled for this repository.

## Product architecture overview

Dedicated manga readers commonly pair a source catalogue with metadata, chapter selection, reading, and local-library workflows. SORYVYN follows that product architecture with its own codebase, product identity, interface, and implementation.

Build these capabilities as original SORYVYN components. Product-category conventions do not authorize copying another project's implementation code, logos, text, or distinctive visual design.

**SORYVYN's online browser is not a general-purpose internet browser.** It must only discover and display manga, manhwa, or manhua. No general search engine, arbitrary URL bar, unrelated websites, general web feed, novels, western comics, or general download browsing belongs in the main browser experience.

## Non-negotiable scope rules

1. The online catalogue allowlist is limited to the product categories **Manga**, **Manhwa**, and **Manhua**.
2. Sources explicitly classified as another content category are excluded from the catalogue.
3. Online search results, recommendations, update feeds, related titles, and alternative-source results must apply the same category allowlist; a blocked category cannot re-enter through a secondary view.
4. Adult/explicit-rated content is filtered from online discovery and recommendations. Unknown or conflicting rating metadata must not be treated as proof that a title is suitable.
5. Local imports are separate from online discovery. The user may import supported reading files, but an imported file must not cause unrelated web content to appear in the online catalogue.
6. The source-scoped interactive web view is only a utility for a selected manga source. It is not a route into unrestricted web browsing.
7. Never bypass DRM, paywalls, logins, age checks, source access controls, or anti-abuse mechanisms. If a site requires an interactive action that SORYVYN cannot handle, explain the limitation and let the user decide what to do.
8. Do not copy third-party source code, logos, text, or distinctive visual design. Each dependency or source adapter must have documented provenance and a license review before distribution.

## Product principles

- **Discover, then read:** the online flow is Catalogue → Search/Filters → Title Details → Chapter Selection → Reader.
- **Local-first:** library data, progress, bookmarks, collections, settings, and downloaded pages live locally by default.
- **Source adapters are independent:** UI components must not scrape websites directly.
- **Partial results are useful:** one failing source must not break search across healthy sources.
- **Accurate status:** show loading, cached, downloaded, unavailable, failed, and retrying states honestly.
- **Original SORYVYN identity:** a polished, restrained interface with consistent original icons and motion, accessible contrast, no clutter, and no overlapping controls.

## 1. Online catalogue — manga-family content only

### Discover screen

The main browse surface is a catalogue, not a blank web browser.

- A prominent manga search field.
- Source cards or a source grid with source name, language, enabled/pinned state, and availability status.
- Discoverable title cards with cover, title, alternate title when available, source, language, update/status information, and reading progress when already in the library.
- Browse/search by title, author/artist, genre/tags, source, language, status, and other metadata that a source actually supports.
- Filters and sort options adapt to source capabilities; do not show controls that the selected source cannot implement.
- Filter by the three allowed content categories only: Manga, Manhwa, and Manhua.
- Continue Reading, Recently Updated, Favorites, and local-library shelves may appear as clearly separate sections.
- Every online item links to a manga detail view; never expose arbitrary website links as catalogue items.
- Empty states explain how to enable a compatible source or adjust search filters.

### Source catalogue and management

Each source has metadata and an explicit capability record:

- Stable source ID, display title, domain, language/locale, content category, connector version, supported operations, and current health state.
- Enable/disable, pin/unpin, reorder, search, and filter by supported language.
- Sort by name, language, recently added, and user-defined order where applicable.
- Show source availability and last successful check without making unsupported claims about coverage.
- Keep built-in and user-installed connectors distinguishable.
- Show source-specific settings and explain when interactive authorization is required.
- Broken, retired, or unmaintained sources must be marked clearly and can be disabled.
- The catalogue allowlist is enforced centrally. UI filters alone are not sufficient.
- Do not ship a source-count marketing number unless the count is generated from the tested, currently enabled source registry.

### Unified multi-source search

- Search enabled sources concurrently using a bounded worker pool.
- Return results progressively as individual sources finish.
- Group results by source, with a combined view available for comparison.
- Allow the user to see which sources returned results, returned none, or failed.
- Support title and alternate-title matching; use author, artist, tag, and other search types only where supported.
- Normalize title, alternate titles, cover, summary, authors, tags, status, language, source, and rating metadata.
- De-duplicate cautiously. Preserve all known source links and never silently replace one title with a different title.
- Rank by exact title match, alternate-title match, query relevance, and then stable metadata signals; explain any available sort choices.
- Include cancellation, timeouts, bounded retries, cooldowns, and rate-limit awareness.
- Search disabled sources only after the user explicitly asks to include them.
- A failed or slow source cannot freeze the search screen.
- Apply category and suitability filters after parsing as well as before rendering so malformed source metadata cannot bypass the catalogue rules.

### Manga detail view

- Cover art, title, alternate titles, authors/artists, description, tags/genres, status, content category, source, language, and last-updated metadata when supplied.
- Chapter and volume listing with number, title, release/upload date, language branch, and scanlator/group where supplied by the source.
- Chapter sorting, branch selection, multi-select, and resume from the last-read chapter.
- Buttons for Read/Continue, Download, Favorite, Add to Collection, Bookmark, Refresh Details, and Open Source Session when required.
- Related-title and alternative-source sections must stay inside the Manga/Manhwa/Manhua allowlist and apply the content suitability filter.
- Sanitize remote descriptions before rendering them; remote HTML is untrusted input.
- Handle missing covers, missing descriptions, empty chapter lists, removed titles, and stale source metadata gracefully.

## 2. Source adapter architecture

Each source adapter implements a documented, versioned interface. The interface should cover the following operations where the source supports them:

- Source metadata and capabilities.
- List/catalogue retrieval with pagination, sort order, and filters.
- Search by title/query and optional supported filter fields.
- Fetch title details and chapter/volume listings.
- Fetch chapter page manifests and resolve page image URLs.
- Fetch source tags/filter options and related titles.
- Resolve a pasted *manga title link* into a title record only when it belongs to an enabled compatible source.
- Report authentication requirements, rate limits, unavailable titles, blocked requests, parsing failures, and unsupported operations as structured errors.

Requirements:

- Stable, source-scoped identifiers for titles, chapters, and pages. Never assume two sources use the same ID namespace.
- Do not hard-code domains inside parsing logic; support configured mirrors only when the source itself provides them.
- Per-source network settings, user-agent handling when necessary, cookies scoped to that source, and bounded timeouts.
- Cancellation and bounded parallel requests for search, metadata, page loading, and downloads.
- Safe HTML/JSON parsing, schema validation, defensive image URL handling, and cache invalidation.
- No unrestricted local-file access or access to secrets from source adapters.
- Do not execute downloaded connector scripts as privileged application code.
- A source error must not discard results already received from another source.
- A connector is not considered compatible until it has tests and a documented maintenance state.
- Keep parser registration, source metadata, and adapter implementation separate from UI code.

## 3. Source-scoped interactive web session

A source-scoped interactive session exists only to complete an explicitly supported action for one selected manga source. Keep this utility narrow and separate from the catalogue.

- Open only from a selected source or title when that source explicitly requires an interactive step.
- Display the source identity and the reason the session was opened.
- Restrict navigation to the source's approved domain/mirror list; block arbitrary external navigation by default.
- No general-purpose address bar, search-engine home page, arbitrary tabs, general web history, or general website bookmarks.
- The session may use the source's required web runtime capabilities, but must not silently bypass CAPTCHA, sign-in checks, DRM, age gates, or access controls.
- Provide Back, Reload, Stop, Close, loading progress, and clear error status only as needed for the source interaction.
- On completion, return to the original SORYVYN action and update its state.
- Keep source cookies and session data scoped to that source; provide a way to clear them.
- If a challenge or login cannot be handled safely, show a clear failure/retry option rather than trying to evade it.
- Use an OS-supported web runtime behind an isolated interface; never make the web runtime the primary catalogue or reader engine.

## 4. Reading engine

The reader is image-first, optimized for sequential manga pages and long vertical manhwa/manhua chapters.

### Reading modes

- Single-page mode.
- Double-page mode where appropriate.
- Right-to-left page progression.
- Left-to-right page progression.
- Vertical scrolling/Webtoon mode.
- Automatic mode detection may be offered, but the user can override it per title.
- Remember the preferred reading mode and settings per title or source where useful.

### Reader controls

- Previous/next page and chapter.
- Progress indicator, page number, chapter list, and jump-to-page controls.
- Fit-to-width, fit-to-height, original-size, zoom, and pan.
- Adjustable page gap, margins, background, image scaling, and page transition.
- Optional color correction such as brightness, contrast, grayscale, and inversion.
- Keyboard, mouse, touch, and trackpad navigation.
- Configurable tap zones and shortcuts; visible keyboard focus and accessible control names.
- Hide UI for immersive reading; restore it without resetting position.
- Bookmark a page and resume exactly where reading stopped.
- Keep progress through app restart and recover safely after errors.
- Preload nearby pages with a small bounded queue; stop unused requests when the user jumps chapters.
- Avoid decoding too many huge images at once; respect memory limits and provide retry for failed images.
- Reduce motion when requested by the operating system or app setting.

## 5. Downloads and offline reading

- Per-chapter and multi-chapter downloads.
- Select chapters by range, volume, branch, unread status, or manual selection when source metadata supports it.
- Visible queue with queued/downloading/paused/completed/failed/cancelled states.
- Pause, resume, cancel, retry, and remove completed downloads.
- Progress, bytes or pages completed, estimated time remaining when meaningful, and clear failure messages.
- Bounded parallelism and per-source rate limits; handle 429/rate-limit responses without aggressive retry loops.
- Download to a managed SORYVYN library folder, with a configurable location.
- Verify file/page completion before labeling a chapter as available offline.
- Resume or reconcile interrupted work after a restart.
- Store source/title/chapter metadata so offline chapters remain understandable if a source disappears.
- Export compatible downloaded chapters to a user-readable archive/folder format where permitted.
- Treat source terms and user rights as the gate for retaining material; do not defeat source restrictions.
- No external browser downloads or arbitrary executable downloads in the online catalogue.

## 6. Local library and import

Online discovery remains manga-family only. Local imports are a separate user-controlled library capability.

- Import image folders and supported manga archives, prioritizing CBZ/CBR/ZIP and a documented folder format.
- Optional local PDF/EPUB support may be included only after a dedicated reader implementation is tested; these formats must not appear as online source categories.
- Add files/folders through a native picker and drag-and-drop.
- Show cover, title, reading progress, file path/location, and local/remote status.
- Deduplicate by stable metadata and file hash when possible, without deleting user files automatically.
- Allow local title/cover/tag corrections and collection organization.
- Detect moved/missing files and provide a relink option.
- Never extract archives without path-traversal protection and file-size limits.
- Treat images, archives, metadata, and descriptions as untrusted input.

## 7. Library, history, and organization

- Continue Reading and Recently Added shelves.
- History with resume positions and clear-history controls.
- Favorites and user-created collections.
- Bookmarks with chapter/page location and optional notes.
- Reading states such as unread, reading, completed, and paused.
- User-defined tags and local metadata overrides.
- Search and filters across the user's own library.
- Optional incognito reading that does not add the session to normal history; do not promise privacy guarantees the implementation does not provide.
- Reading statistics and reading-time estimates can be added after the core progress model is stable.

## 8. Updates, recommendations, and integrations

- An updates feed for enabled sources that expose reliable chapter-update data.
- Notifications are opt-in and have per-source controls.
- Recommendations may use selected tags or reading history only when enabled by the user.
- Related titles and source alternatives must always use the category allowlist and content-suitability filter.
- Optional tracking integrations (for example, third-party reading lists) are separate modules and require explicit opt-in.
- Optional sync is a later milestone. Define authentication, encryption, conflict behavior, data export, account removal, and server availability before shipping it.
- Local backup/restore should be implemented before sync and should include versioned metadata for library entries, favorites, collections, history, bookmarks, reader settings, and source configuration.
- Do not upload reading history, local files, or source session data without explicit consent.

## 9. UI, layout, and interaction

SORYVYN must have an original, polished desktop identity.

- Main navigation: **Discover, Library, Updates, Downloads, History, Favorites, Bookmarks, Settings**. Allow sensible customization later.
- Discover uses catalogue/search surfaces, never a generic browser homepage.
- Responsive layout for narrow and wide windows; support desktop keyboard usage.
- Monochrome-first visual language, restrained accents, clear hierarchy, consistent spacing, and original vector icons.
- Subtle glass-like surfaces and short transitions may be used, but readability and performance win over effects.
- No emoji icons, fake controls, text-over-text buttons, clipped labels, accidental overlines, or ambiguous hover-only actions.
- Every interactive element has a focus state, keyboard operation, accessible name, and reduced-motion behavior.
- Dark theme, light theme, and system-theme option.
- No layout shifts that unexpectedly change the reading position.
- Loading, empty, partial, unavailable, offline, and error states must have deliberate designs and clear next actions.
- Do not invent source logos or use third-party artwork as SORYVYN's own branding.

## 10. Suggested architecture

Target Windows desktop first while keeping platform boundaries clean.

- **UI:** TypeScript with a component-based framework.
- **Desktop host:** Tauri 2 and Rust, using narrow command permissions and platform-native file dialogs.
- **Database:** SQLite for source metadata, title metadata, chapters, progress, favorites, collections, bookmarks, source settings, and task state.
- **Filesystem:** managed library/download folders and cache for covers/page images; store file references and integrity metadata in SQLite.
- **Source engine:** isolated adapter interface and registry; no source scraping in UI components.
- **Network layer:** configurable per-source client sessions, cookie isolation, timeouts, cancellation, rate limiting, and redacted diagnostics.
- **Reader engine:** common page/chapter navigation contract with image decoding and different reading-mode implementations.
- **Download queue:** persistent task state and bounded workers; recover after restart.
- **Source-scoped web runtime:** separate from the main app UI and restricted to the selected source.
- **Tests:** unit tests for models, filtering, storage, adapter parsing, cache and queue logic; integration tests for import, search, page loading, chapter download, progress recovery, and offline reading.

Keep these boundaries independent: catalogue UI, source registry, adapters, source-session web view, title details, reader, local library, download queue, history, backups, and optional integrations.

## 11. Data model

At minimum, model:

- **Source:** ID, title, domain/mirrors, locale, allowed category, capabilities, connector version, enabled/pinned state, health status, settings, and last successful check.
- **Title:** stable source-scoped ID, title, alternate titles, description, cover URLs/cache key, author/artist, tags, status, category, rating metadata, source ID, canonical public URL, and update time.
- **Chapter:** source-scoped ID, title, chapter/volume number, language/branch, group/scanlator when available, upload date, URL, and download state.
- **Page:** stable chapter-scoped ID/order, image URL, preview URL when available, cache key, download state, and dimensions when known.
- **Library state:** reading status, last chapter/page, progress, favorite/collection memberships, bookmarks, reader mode, overrides, and last-read time.
- **Background task:** task ID, source/title/chapter IDs, state, progress, retry count, timestamps, and safe diagnostic code.

Validate metadata before it reaches the UI or database. Persist only the fields necessary for app behavior. IDs from different sources must never collide.

## 12. Implementation plan

### Phase 0 — repository and design foundation
1. Define the app architecture, build workflow, design tokens, icon rules, and supported operating system.
2. Create the navigation shell and responsive component system.
3. Define the data model, migration policy, source adapter contract, and test fixtures.
4. Implement the **Manga/Manhwa/Manhua-only allowlist** as a central policy with automated tests before adding sources.

### Phase 1 — local reader and library
1. Import CBZ/CBR/ZIP and folders.
2. Build single-page, double-page, right-to-left, left-to-right, and vertical reader modes.
3. Persist progress, bookmarks, favorites, collections, and reader settings.
4. Add backup/export of local metadata.

### Phase 2 — source engine and catalogue
1. Implement source registry and per-source settings.
2. Add a small number of well-tested, general-audience-compatible source adapters.
3. Add source grid, category/language filters, title details, and chapter lists.
4. Implement multi-source search with progressive results, rate limiting, cancellation, and partial failures.
5. Enforce category/rating policy in the adapter layer, result normalization, database query, recommendations, updates, and final UI projection.

### Phase 3 — remote reading and downloads
1. Load chapter page manifests and images.
2. Implement cache, bounded prefetch, per-source headers/session handling, and retry states.
3. Add persistent downloads with pause/resume/cancel/retry and offline chapter access.
4. Implement source-specific interactive sessions only when required and keep them domain-restricted.

### Phase 4 — refinement
1. Add updates, opt-in notifications, recommendations, and alternative sources.
2. Add import/export, backup/restore, duplicate detection, and diagnostics.
3. Evaluate optional third-party tracking and sync integrations.
4. Add signed installers, release notes, crash reporting with redaction, accessibility checks, and reproducible builds.

## 13. Definition of done

SORYVYN is not ready to call its browser complete until all of these are verified:

1. Discover displays only Manga, Manhwa, and Manhua categories.
2. Unapproved source types and adult/explicit-rated items are not shown by search, recommendations, updates, related titles, alternate sources, or cached feeds.
3. No general URL bar, unrestricted website tabs, general search-engine results, or arbitrary-site browsing exists in the main Discover flow.
4. Search returns progressive grouped results; failures from one source do not block successful sources.
5. Source-specific filters are shown only when supported and produce correct results.
6. Selecting a title opens details and chapters for that exact title/source.
7. Reader modes navigate pages and chapters correctly and restore reading progress after restart.
8. A chapter is marked offline only after its required pages are verified.
9. Downloads can be paused, resumed, cancelled, retried, and recovered after restart.
10. A source-scoped interactive session cannot turn into unrestricted browsing and never silently bypasses access controls.
11. Local imports cannot escape the chosen folder through a malicious archive path.
12. Backup/restore validates format versions and reports incomplete restores clearly.
13. The application remains usable with keyboard navigation, narrow windows, low-memory conditions, and reduced motion.

## Proprietary ownership and content integrity

**SORYVYN is proprietary software, not an open-source project.** Copyright © 2026 Robiul Rumman Razim (Tamasrazim). All rights reserved. The repository's [`LICENSE` notice](./LICENSE) does not grant a general right to reuse, modify, redistribute, or sell SORYVYN. Any additional permission must be provided in writing by the copyright holder, subject to applicable law and GitHub's terms for publicly hosted repositories.

A public repository is visible to everyone, and GitHub's Terms of Service permit certain viewing and forking within GitHub. A proprietary notice does not make public source code invisible. Keep that distinction in mind when deciding repository visibility. Third-party components and content remain subject to their own rights and terms.

SORYVYN must respect source access rules and make the source and origin of every online result visible. Never bypass DRM, paywalls, authentication, age checks, source access controls, or anti-abuse protections.
