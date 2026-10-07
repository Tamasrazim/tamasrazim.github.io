# Repo Token Meter

Standalone GitHub Pages tool for measuring a repository's current source footprint.

Live project path:

https://tamasrazim.github.io/projects/repo-token-meter/

## What it measures

- Current repository file count and total bytes.
- Text/source bytes with common binary assets excluded.
- Estimated source tokens using a configurable characters-per-token ratio.
- A ±12% estimate range.
- Largest source files.
- First/latest commit dates.
- Commit comparison additions/deletions for the latest 100-commit history window.
- GitHub REST API remaining request count.
- Local browser measurement history.

## API authentication and rate limits

The meter works without authentication, but GitHub's anonymous REST API limit is low and can be exhausted after repeated scans. The page now supports an optional GitHub access token.

The token is entered in the browser and sent as an Authorization header only to api.github.com. It is never committed to this repository and is not stored in measurement history. The optional "remember" setting uses the browser session only.

Use the smallest permissions necessary. For a public repository, read access is enough. For a private repository, the token needs read access to that repository.

The repository snapshot scan is separate from history analysis: it walks every tracked blob in the selected branch, including a directory-by-directory fallback when GitHub truncates its recursive tree response. Commit history analysis intentionally uses a latest-100 window so a full repository snapshot does not require hundreds or thousands of extra API calls. The meter reads GitHub rate-limit information before the scan, watches the remaining budget, and turns a 403 rate-limit response into a useful reset message instead of repeatedly retrying.

## Token meaning

GitHub does not expose an official "AI token usage" value for repository storage. The token number in this project is an estimate of the repository's text/code footprint, not a ChatGPT, Claude, or API billing counter.

No backend is used and measurement history remains local to the browser.

For `Tamasrazim/tamasrazim.github.io`, the Pages app also uses `repo-manifest.json`, generated from the repository's tracked-file list. This makes full-repository snapshot scanning work without browser CORS or GitHub REST quota. The accompanying GitHub Actions workflow refreshes the manifest after future changes.
