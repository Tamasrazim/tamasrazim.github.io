# SORYVYN Web PWA — Delivery Roadmap

SORYVYN is being implemented as a real web PWA first. The native application is a separate next stage. This document distinguishes shipped behavior from integrations that still need implementation.

## Shipped in the main website repository

- Responsive monochrome web PWA at `/projects/soryvyn/`.
- Two-page 3D open-book reader with drag, mouse-wheel, and keyboard page turns.
- Local image-folder import, sorted naturally by filename, stored in IndexedDB.
- Local reading progress, history, saved titles, favorites, and per-spread bookmarks.
- JSON backup export and validated restore.
- PWA manifest, service worker, and offline shell cache.
- Official source directory with real outbound links to MANGA Plus by SHUEISHA, WEBTOON, VIZ Manga, KODANSHA, Tapas, and GlobalComix.
- Search submission from the main search field routes to official platform search pages where available.
- Proprietary, all-rights-reserved notice.

## Remaining implementation

### 1. Online source adapters
Implement and test provider-supported integrations only. Do not scrape or mirror protected chapter pages, bypass paywalls, reuse private APIs without permission, or defeat source access controls. Where a provider offers no supported reader API, use the provider's official website as the reading destination.

### 2. Real title metadata
Use source-owned public search/catalogue endpoints only where the provider permits this use. Normalize title, creator, language, category, publication state, cover URL, official URL, and available chapter metadata. Enforce the Manga / Manhwa / Manhua category allowlist centrally. Do not display invented title records or pretend unsupported results are live.

### 3. Reader integration
Keep the custom 3D reader for local/imported pages and content the user is authorized to open in it. Provider-hosted chapters open on the provider's website unless the provider explicitly permits in-app rendering.

### 4. Local import hardening
Add archive import with safe path validation, duplicate detection, storage quota handling, and rollback on partial failures. Keep folder import working without an account or cloud service.

### 5. Offline library
Add clear local storage usage, per-edition removal, export of original imported files when browser APIs permit it, and robust recovery after a browser restart. Do not download provider chapters unless the provider explicitly supports it.

### 6. Quality and release
Run JavaScript syntax checks, accessibility checks, keyboard and touch interaction tests, service-worker update tests, import limits tests, and mobile layout tests. Verify GitHub Pages deployment from the main website repository.

## Hard constraints

- No fictional manga titles, fake chapter counts, fake source-health indicators, or fabricated update feeds.
- The source directory is not a general-purpose browser.
- No DRM/paywall/login/age-check/access-control bypass.
- Do not claim live chapter search or downloads until each supported connector has been implemented and tested.
- Copyright and source terms must be reviewed before enabling an online adapter.
- SORYVYN source and design are proprietary; no MIT license.
