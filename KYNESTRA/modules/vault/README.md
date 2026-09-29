# Stock Vault

Stock Vault is KYNESTRA's local asset library and publishing tracker.

## Current foundation

The Core can now register a rendered output into a project:

1. A render job is persisted in Core.
2. The completed output file is copied into the project's `renders/` directory.
3. The asset is hashed with SHA-256.
4. Duplicate content in the same project resolves to the existing asset.
5. Vault reads the asset registry and shows the imported file.

## Next Vault layer

- platform account configuration
- submission records and states
- exact filename/title checks against configured contributor profile links
- public-status checks
- multi-platform connectors

Vault is not limited to Shutterstock.

## Account and submission foundation

Accounts store platform name, display name, contributor/profile URL, connection state, and an optional credential reference. They do not store passwords or secret tokens in the project database.

Submission records track `not_submitted`, `submitted`, `pending`, `approved`, `rejected`, or `unknown` states per asset/account pair.

Public verification is intentionally separate: a missing public result is not treated as rejection.

## Public-status verification

Vault can run a generic exact-filename check against the configured contributor/profile URL for a submission.

Results are separated from submission status:

- `found` — exact filename was present in fetched HTML.
- `not_found` — exact filename was not present in fetched HTML.
- `blocked` — the page could not be fetched successfully.
- `unknown` — there was no usable profile URL.

A `not_found` result is not treated as rejection. Dynamic/client-rendered platforms can require a platform-specific connector later.
