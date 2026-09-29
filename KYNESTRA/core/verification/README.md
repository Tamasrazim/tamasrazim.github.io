# Public Status Verification

The first verifier is deliberately generic. It fetches the configured profile URL and searches its fetched HTML for the exact asset filename.

It does not interpret absence as rejection and does not change submission approval state.

## Known limitation

Many modern sites render portfolio listings client-side. Those pages may return `not_found` even when an asset is public. Platform-specific connectors are the next layer.
