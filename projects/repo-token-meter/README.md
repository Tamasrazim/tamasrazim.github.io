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
- Commit comparison additions/deletions over the latest scanned history window.
- GitHub REST API remaining request count.
- Local browser measurement history.

## API authentication and rate limits

The meter works without authentication, but GitHub's anonymous REST API limit is low and can be exhausted after repeated scans. The page now supports an optional GitHub access token.

The token is entered in the browser and sent as an Authorization header only to api.github.com. It is never committed to this repository and is not stored in measurement history. The optional "remember" setting uses the browser session only.

Use the smallest permissions necessary. For a public repository, read access is enough. For a private repository, the token needs read access to that repository.

The scanner also avoids the old 1,000-commit pagination loop. It scans at most the latest 100 commits, reads GitHub rate-limit information before the scan, watches the remaining rate budget, and turns a 403 rate-limit response into a useful reset message instead of repeatedly retrying.

## Token meaning

GitHub does not expose an official "AI token usage" value for repository storage. The token number in this project is an estimate of the repository's text/code footprint, not a ChatGPT, Claude, or API billing counter.

No backend is used and measurement history remains local to the browser.
