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
