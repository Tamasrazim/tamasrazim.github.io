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
- Commit comparison additions/deletions when GitHub exposes them.
- GitHub REST API remaining request count.
- Local browser measurement history.

## Important limitation

GitHub does not expose an official "AI token usage" value for repository storage. The token number in this project is an estimate of the repository's text/code footprint, not a ChatGPT, Claude, or API billing counter.

No backend is used and measurements are kept locally in the browser.
